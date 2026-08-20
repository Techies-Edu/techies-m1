/**
 * useNearbyDevices — Hook subscribing to the DeviceRegistry real-time list of discovered MeshConnect devices.
 */
import { useEffect, useState } from 'react';
import { DeviceRegistry } from '../services';
import { NearbyDevice } from '../types';

export function useNearbyDevices(): NearbyDevice[] {
  const [devices, setDevices] = useState<NearbyDevice[]>([]);

  useEffect(() => {
    const unsubscribe = DeviceRegistry.subscribe((updatedList: NearbyDevice[]) => {
      setDevices(updatedList);
    });

    return () => {
      unsubscribe();
    };
  }, []);

  return devices;
}
