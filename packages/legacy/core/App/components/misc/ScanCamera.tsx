import React, { useCallback, useEffect, useRef, useState } from 'react'
import { StyleSheet, Vibration, View, useWindowDimensions } from 'react-native'
import { useOrientationChange, OrientationType } from 'react-native-orientation-locker'
import { Camera, Code, useCameraDevice, useCameraFormat, useCodeScanner } from 'react-native-vision-camera'

import { QrCodeScanError } from '../../types/error'

interface Props {
  handleCodeScan: (value: string) => Promise<void>
  error?: QrCodeScanError | null
  enableCameraOnError?: boolean
  torchActive?: boolean
}
const ScanCamera: React.FC<Props> = ({ handleCodeScan, error, enableCameraOnError, torchActive }) => {
  const [orientation, setOrientation] = useState(OrientationType.PORTRAIT)
  const [cameraActive, setCameraActive] = useState(true)
  const [cameraReady, setCameraReady] = useState(false)
  const orientationDegrees: { [key: string]: string } = {
    [OrientationType.PORTRAIT]: '0deg',
    [OrientationType['LANDSCAPE-LEFT']]: '270deg',
    [OrientationType['PORTRAIT-UPSIDEDOWN']]: '180deg',
    [OrientationType['LANDSCAPE-RIGHT']]: '90deg',
  }
  const invalidQrCodes = new Set<string>()
  const device = useCameraDevice('back')
  const screenAspectRatio = useWindowDimensions().scale
  const format = useCameraFormat(device, [
    { fps: 20 },
    { videoAspectRatio: screenAspectRatio },
    { videoResolution: 'max' },
    { photoAspectRatio: screenAspectRatio },
    { photoResolution: 'max' },
  ])
  useOrientationChange((orientationType) => {
    setOrientation(orientationType)
  })
  const camera = useRef<Camera>(null)

  const onCodeScanned = useCallback(
    (codes: Code[]) => {
      const value = codes[0].value
      if (!value || invalidQrCodes.has(value)) {
        return
      }

      if (error?.data === value) {
        invalidQrCodes.add(value)
        if (enableCameraOnError) {
          return setCameraActive(true)
        }
      }

      if (cameraActive) {
        Vibration.vibrate()
        handleCodeScan(value)
        return setCameraActive(false)
      }
    },
    [cameraActive]
  )

  useEffect(() => {
    if (error?.data && enableCameraOnError) {
      setCameraActive(true)
    }
  }, [error])

  useEffect(() => {
    if (!device || !camera.current || !cameraReady) {
      console.log('No device or camera')
      return
    }

    
    console.warn('Starting recording')
    camera.current.startRecording({ fileType: 'mp4', onRecordingError: (error) => console.warn('Error recording', error), onRecordingFinished: (video) => console.warn('Recording finished', video) })
    setTimeout(() => {
      camera.current?.stopRecording()
    }, 5000)
  }, [cameraReady, device, camera])

  const codeScanner = useCodeScanner({
    codeTypes: ['qr'],
    onCodeScanned: onCodeScanned,
  })
  return (
    <View style={[StyleSheet.absoluteFill, { transform: [{ rotate: orientationDegrees[orientation] ?? '0deg' }] }]}>
      {device && (
        <Camera
          style={StyleSheet.absoluteFill}
          device={device}
          torch={torchActive ? 'on' : 'off'}
          isActive={cameraActive}
          codeScanner={codeScanner}
          format={format}
          onInitialized={()=>{setCameraReady(true); console.log('Camera initialized')}}
        />
      )}
    </View>
  )
}

export default ScanCamera
