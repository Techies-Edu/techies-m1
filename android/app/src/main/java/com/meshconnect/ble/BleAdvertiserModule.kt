package com.meshconnect.ble

import android.annotation.SuppressLint
import android.bluetooth.*
import android.bluetooth.le.AdvertiseCallback
import android.bluetooth.le.AdvertiseData
import android.bluetooth.le.AdvertiseSettings
import android.bluetooth.le.BluetoothLeAdvertiser
import android.content.Context
import android.os.ParcelUuid
import com.facebook.react.bridge.*
import com.facebook.react.modules.core.DeviceEventManagerModule
import java.util.*

@SuppressLint("MissingPermission")
class BleAdvertiserModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    override fun getName(): String = "BleAdvertiser"

    private var bluetoothManager: BluetoothManager? = null
    private var bluetoothAdapter: BluetoothAdapter? = null
    private var advertiser: BluetoothLeAdvertiser? = null
    private var gattServer: BluetoothGattServer? = null
    private var advertiseCallback: AdvertiseCallback? = null

    private val SERVICE_UUID: UUID = UUID.fromString("10000000-0000-1000-8000-00805f9b34fb")
    private val CHARACTERISTIC_UUID: UUID = UUID.fromString("10000001-0000-1000-8000-00805f9b34fb")

    /**
     * Profile characteristic — JS calls setProfileData() to update this.
     * Central devices read this characteristic to obtain the owner's JSON profile.
     */
    private val PROFILE_CHAR_UUID: UUID = UUID.fromString("10000002-0000-1000-8000-00805f9b34fb")

    /** In-memory copy of the current own-profile JSON. Updated by setProfileData(). */
    @Volatile
    private var profileDataBytes: ByteArray = "{}".toByteArray(Charsets.UTF_8)

    /** Cached reference to the profile characteristic so we can update its value in-place. */
    private var profileCharacteristic: BluetoothGattCharacteristic? = null

    init {
        bluetoothManager = reactContext.getSystemService(Context.BLUETOOTH_SERVICE) as? BluetoothManager
        bluetoothAdapter = bluetoothManager?.adapter
    }

    private fun sendEvent(eventName: String, params: WritableMap?) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, params)
    }

    private fun sendEvent(eventName: String, message: String) {
        reactContext
            .getJSModule(DeviceEventManagerModule.RCTDeviceEventEmitter::class.java)
            .emit(eventName, message)
    }

    /**
     * Called by JS whenever the user saves their profile.
     * Updates the GATT characteristic value so nearby centrals can read the latest profile.
     */
    @ReactMethod
    fun setProfileData(jsonData: String, promise: Promise) {
        try {
            profileDataBytes = jsonData.toByteArray(Charsets.UTF_8)

            // Also update the live characteristic value if the GATT server is running
            profileCharacteristic?.value = profileDataBytes

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("SET_PROFILE_ERROR", e.message, e)
        }
    }

    @ReactMethod
    fun startAdvertising(deviceId: String, deviceName: String, promise: Promise) {
        try {
            if (bluetoothAdapter == null || !bluetoothAdapter!!.isEnabled) {
                promise.reject("BLUETOOTH_DISABLED", "Bluetooth adapter is disabled or unavailable")
                return
            }

            advertiser = bluetoothAdapter!!.bluetoothLeAdvertiser
            if (advertiser == null) {
                promise.reject("BLE_UNSUPPORTED", "Device hardware does not support BLE Peripheral Advertising")
                return
            }

            // Set local Bluetooth name
            try {
                bluetoothAdapter!!.name = deviceName
            } catch (_: Exception) {}

            // Setup GATT Server so other centrals can connect cleanly
            setupGattServer()

            val settings = AdvertiseSettings.Builder()
                .setAdvertiseMode(AdvertiseSettings.ADVERTISE_MODE_LOW_LATENCY)
                .setTxPowerLevel(AdvertiseSettings.ADVERTISE_TX_POWER_HIGH)
                .setConnectable(true)
                .setTimeout(0) // Advertise indefinitely
                .build()

            val pUuid = ParcelUuid(SERVICE_UUID)

            // CRITICAL BLE FIX: Keep main advertisement payload strictly under 31 bytes limit!
            // 128-bit Service UUID takes 18 bytes.
            // Short 6-byte raw device ID bytes take 10 bytes (2 header + 2 company ID + 6 payload).
            // Total = 28 bytes <= 31 bytes limit!
            val shortIdBytes = deviceId.replace("-", "").take(12).chunked(2)
                .map { it.toInt(16).toByte() }
                .toByteArray()

            val data = AdvertiseData.Builder()
                .setIncludeDeviceName(false) // Placed in scan response to save bytes
                .setIncludeTxPowerLevel(false)
                .addServiceUuid(pUuid)
                .addManufacturerData(0xFFFF, shortIdBytes)
                .build()

            // Put device name in Scan Response packet (31 bytes max)
            val scanResponse = AdvertiseData.Builder()
                .setIncludeDeviceName(true)
                .setIncludeTxPowerLevel(true)
                .build()

            // Stop previous callback if active
            if (advertiseCallback != null) {
                try {
                    advertiser?.stopAdvertising(advertiseCallback)
                } catch (_: Exception) {}
            }

            var promiseResolved = false

            advertiseCallback = object : AdvertiseCallback() {
                override fun onStartSuccess(settingsInEffect: AdvertiseSettings?) {
                    super.onStartSuccess(settingsInEffect)
                    if (!promiseResolved) {
                        promiseResolved = true
                        promise.resolve(true)
                    }
                    sendEvent("BLE_ADVERTISE_STARTED", null)
                }

                override fun onStartFailure(errorCode: Int) {
                    super.onStartFailure(errorCode)
                    val errorMsg = when (errorCode) {
                        ADVERTISE_FAILED_DATA_TOO_LARGE -> "Advertise data too large (>31 bytes)"
                        ADVERTISE_FAILED_TOO_MANY_ADVERTISERS -> "Too many advertisers"
                        ADVERTISE_FAILED_ALREADY_STARTED -> "Advertising already started"
                        ADVERTISE_FAILED_INTERNAL_ERROR -> "Internal Bluetooth controller error"
                        ADVERTISE_FAILED_FEATURE_UNSUPPORTED -> "BLE advertising unsupported on this hardware"
                        else -> "BLE Advertise failed with code: $errorCode"
                    }
                    if (!promiseResolved) {
                        promiseResolved = true
                        promise.reject("ADVERTISE_FAILED", errorMsg)
                    }
                    sendEvent("BLE_ADVERTISE_FAILED", errorMsg)
                }
            }

            advertiser!!.startAdvertising(settings, data, scanResponse, advertiseCallback)

        } catch (e: Exception) {
            promise.reject("ADVERTISE_ERROR", e.message, e)
        }
    }

    private fun setupGattServer() {
        if (gattServer != null) return

        gattServer = bluetoothManager?.openGattServer(reactContext, object : BluetoothGattServerCallback() {
            override fun onConnectionStateChange(device: BluetoothDevice?, status: Int, newState: Int) {
                super.onConnectionStateChange(device, status, newState)
                val params = Arguments.createMap()
                params.putString("deviceId", device?.address ?: "Unknown")
                params.putString("deviceName", device?.name ?: "Unknown")

                if (newState == BluetoothProfile.STATE_CONNECTED) {
                    sendEvent("BLE_PERIPHERAL_CONNECTED", params)
                } else if (newState == BluetoothProfile.STATE_DISCONNECTED) {
                    sendEvent("BLE_PERIPHERAL_DISCONNECTED", params)
                }
            }

            override fun onCharacteristicReadRequest(
                device: BluetoothDevice?,
                requestId: Int,
                offset: Int,
                characteristic: BluetoothGattCharacteristic?
            ) {
                super.onCharacteristicReadRequest(device, requestId, offset, characteristic)

                when (characteristic?.uuid) {
                    PROFILE_CHAR_UUID -> {
                        // Return current profile JSON bytes, respecting GATT offset for long reads
                        val data = profileDataBytes
                        val chunk = if (offset < data.size) data.copyOfRange(offset, data.size) else ByteArray(0)
                        gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, chunk)
                    }
                    CHARACTERISTIC_UUID -> {
                        gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_SUCCESS, offset, "MeshConnect".toByteArray())
                    }
                    else -> {
                        gattServer?.sendResponse(device, requestId, BluetoothGatt.GATT_FAILURE, offset, null)
                    }
                }
            }

            override fun onMtuChanged(device: BluetoothDevice?, mtu: Int) {
                super.onMtuChanged(device, mtu)
            }
        })

        // Primary MeshConnect service
        val service = BluetoothGattService(SERVICE_UUID, BluetoothGattService.SERVICE_TYPE_PRIMARY)

        // Legacy characteristic (keep for backwards compat)
        val characteristic = BluetoothGattCharacteristic(
            CHARACTERISTIC_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ or BluetoothGattCharacteristic.PROPERTY_NOTIFY,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        service.addCharacteristic(characteristic)

        // Profile data characteristic — central reads this to get peer's JSON profile
        val profileCharacteristicLocal = BluetoothGattCharacteristic(
            PROFILE_CHAR_UUID,
            BluetoothGattCharacteristic.PROPERTY_READ,
            BluetoothGattCharacteristic.PERMISSION_READ
        )
        profileCharacteristicLocal.value = profileDataBytes
        profileCharacteristic = profileCharacteristicLocal
        service.addCharacteristic(profileCharacteristicLocal)

        gattServer?.addService(service)
    }

    @ReactMethod
    fun stopAdvertising(promise: Promise) {
        try {
            if (advertiser != null && advertiseCallback != null) {
                advertiser!!.stopAdvertising(advertiseCallback)
                advertiseCallback = null
            }

            gattServer?.close()
            gattServer = null
            profileCharacteristic = null

            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("STOP_ERROR", e.message, e)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            if (advertiser != null && advertiseCallback != null) {
                advertiser!!.stopAdvertising(advertiseCallback)
                advertiseCallback = null
            }
            gattServer?.close()
            gattServer = null
            profileCharacteristic = null
        } catch (_: Exception) {}
    }
}
