package com.meshconnect.wifidirect

import android.content.Context
import android.net.wifi.p2p.WifiP2pConfig
import android.net.wifi.p2p.WifiP2pDevice
import android.net.wifi.p2p.WifiP2pInfo
import android.net.wifi.p2p.WifiP2pManager
import android.os.Looper
import android.util.Log
import com.facebook.react.bridge.*
import java.io.InputStream
import java.io.OutputStream
import java.net.InetSocketAddress
import java.net.ServerSocket
import java.net.Socket
import java.util.concurrent.Executors

class WifiDirectModule(private val reactContext: ReactApplicationContext) :
    ReactContextBaseJavaModule(reactContext) {

    private var manager: WifiP2pManager? = null
    private var channel: WifiP2pManager.Channel? = null
    private var serverSocket: ServerSocket? = null
    private var profileJson: String = "{}"

    private val executor = Executors.newCachedThreadPool()

    companion object {
        private const val TAG = "WifiDirectModule"
        private const val PORT = 8888
        private const val SOCKET_TIMEOUT_MS = 5000
    }

    override fun getName(): String = "WifiDirectModule"

    init {
        try {
            manager = reactContext.getSystemService(Context.WIFI_P2P_SERVICE) as? WifiP2pManager
            if (manager != null) {
                channel = manager?.initialize(reactContext, Looper.getMainLooper(), null)
            }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to initialize WifiP2pManager", e)
        }
    }

    @ReactMethod
    fun setProfileData(json: String, promise: Promise) {
        profileJson = json
        promise.resolve(true)
    }

    @ReactMethod
    fun startP2pServer(promise: Promise) {
        executor.execute {
            try {
                if (serverSocket == null || serverSocket?.isClosed == true) {
                    serverSocket = ServerSocket(PORT)
                }
                Log.d(TAG, "Wi-Fi Direct P2P Server listening on port $PORT")
                promise.resolve(true)

                while (serverSocket != null && !serverSocket!!.isClosed) {
                    try {
                        val clientSocket = serverSocket!!.accept()
                        clientSocket.soTimeout = SOCKET_TIMEOUT_MS
                        executor.execute {
                            try {
                                val output: OutputStream = clientSocket.getOutputStream()
                                val bytes = profileJson.toByteArray(Charsets.UTF_8)
                                output.write(bytes)
                                output.flush()
                                clientSocket.close()
                                Log.d(TAG, "Profile sent over Wi-Fi Direct")
                            } catch (e: Exception) {
                                Log.e(TAG, "Error writing Wi-Fi Direct socket", e)
                            }
                        }
                    } catch (e: Exception) {
                        break
                    }
                }
            } catch (e: Exception) {
                Log.e(TAG, "Failed to start P2P server", e)
                promise.reject("SERVER_ERROR", e.message, e)
            }
        }
    }

    @ReactMethod
    fun fetchProfileOverWifiDirect(hostIp: String, promise: Promise) {
        executor.execute {
            var socket: Socket? = null
            try {
                socket = Socket()
                val targetIp = if (hostIp.isEmpty()) "192.168.49.1" else hostIp
                socket.connect(InetSocketAddress(targetIp, PORT), SOCKET_TIMEOUT_MS)
                socket.soTimeout = SOCKET_TIMEOUT_MS

                val input: InputStream = socket.getInputStream()
                val buffer = ByteArray(4096)
                val bytesRead = input.read(buffer)

                if (bytesRead > 0) {
                    val jsonStr = String(buffer, 0, bytesRead, Charsets.UTF_8)
                    promise.resolve(jsonStr)
                } else {
                    promise.reject("EMPTY_RESPONSE", "No profile data received over Wi-Fi Direct")
                }
            } catch (e: Exception) {
                Log.w(TAG, "Wi-Fi Direct socket fetch failed: ${e.message}")
                promise.reject("FETCH_FAILED", e.message, e)
            } finally {
                try {
                    socket?.close()
                } catch (_: Exception) {}
            }
        }
    }

    @ReactMethod
    fun cancelP2pServer(promise: Promise) {
        try {
            serverSocket?.close()
            serverSocket = null
            promise.resolve(true)
        } catch (e: Exception) {
            promise.reject("CANCEL_FAILED", e.message, e)
        }
    }

    override fun onCatalystInstanceDestroy() {
        super.onCatalystInstanceDestroy()
        try {
            serverSocket?.close()
            serverSocket = null
        } catch (_: Exception) {}
    }
}
