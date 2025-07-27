// screens/UserFlow.js
import React, { useState, useRef, useEffect } from 'react';
import * as FileSystem from 'expo-file-system';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Alert,
  Image,
  Dimensions,
  ActivityIndicator,
  ScrollView,
} from 'react-native';
// --- CORRECTED IMPORTS ---
// Import CameraView, useCameraPermissions, and the microphone permission function
import { CameraView, useCameraPermissions } from 'expo-camera'; // <-- Correct import for mic permission
// import { requestPermissionsAsync as requestMicrophonePermissionsAsync } from 'expo-av';
import { Audio } from 'expo-av';
// Import Video from expo-av
import { Video } from 'expo-av';
import * as MediaLibrary from 'expo-media-library';
import * as Location from 'expo-location';
// Import Firestore and Storage utilities
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, GeoPoint, FieldValue } from 'firebase/firestore';
import { db, storage } from '../firebaseConfig'; // Adjust path if needed

const { width, height } = Dimensions.get('window');

export default function UserFlow({ navigation }) {
  // --- CORRECTED PERMISSION HOOKS ---
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [mediaPermission, requestMediaPermission] = MediaLibrary.usePermissions();
  // --- State for Microphone Permission ---
  const [microphonePermission, setMicrophonePermission] = useState(null); // null = not checked, true/false = granted/denied

  // --- Camera Settings ---
  const [cameraType, setCameraType] = useState('back');
  const [flashMode, setFlashMode] = useState('off');
  const [isRecording, setIsRecording] = useState(false);
  const [photoUri, setPhotoUri] = useState(null);
  const [videoUri, setVideoUri] = useState(null);
  const [currentStep, setCurrentStep] = useState(1); // 1: Photo, 2: Video, 3: Review
  const [uploading, setUploading] = useState(false);
  const [location, setLocation] = useState(null);
  const [errorMsg, setErrorMsg] = useState(null);

  const cameraRef = useRef(null);

  useEffect(() => {
    (async () => {
      // Camera permission
      const cameraStatus = await requestCameraPermission();
      if (cameraStatus.status !== 'granted') {
        Alert.alert('Permission Denied', 'Camera permission is required to take photos and record videos.');
        return;
      }

      // Media library permission
      const mediaStatus = await requestMediaPermission();
      if (mediaStatus.status !== 'granted') {
        console.log('Media library permission not granted. This might limit saving media.');
      }

      // --- Request Microphone Permission ---
      console.log("Requesting microphone permission...");
      try {
        // Use the imported function directly
        const { status: micStatus } = await Audio.requestPermissionsAsync();
        console.log("Microphone permission status:", micStatus);
        setMicrophonePermission(micStatus === 'granted');

        if (micStatus !== 'granted') {
            Alert.alert(
                'Permission Info',
                'Microphone permission was requested. Recording might fail if denied. You can change this in your device settings.'
            );
        }
        // Note: We don't 'return' here even if denied, as we will try recording with mute.
      } catch (micError) {
         console.error("Error requesting microphone permission:", micError);
         Alert.alert('Permission Error', 'Could not request microphone permission. Recording might be affected.');
         setMicrophonePermission(false); // Treat error as denied
      }

      // Location permission
      const { status: locationStatus } = await Location.requestForegroundPermissionsAsync();
      if (locationStatus !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        Alert.alert('Permission Denied', 'Location access is required for reports.');
      } else {
        try {
          let locationData = await Location.getCurrentPositionAsync({});
          setLocation(locationData);
        } catch (error) {
          console.error("Error getting location:", error);
          setErrorMsg('Could not get current location.');
        }
      }
    })();
  }, []); // Dependency array remains empty

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync({
          quality: 0.8,
        });
        console.log("Photo taken:", photo.uri);
        setPhotoUri(photo.uri);
        setCurrentStep(2);
      } catch (error) {
        console.error('Error taking picture:', error);
        Alert.alert('Error', 'Failed to take picture. Please try again.');
      }
    } else {
        console.log("Camera ref is not available");
        Alert.alert('Error', 'Camera not ready. Please try again.');
    }
  };

  const submitReport = async () => {
  // 1. Guard Clause: Check if all necessary data is available before proceeding.
  if (!photoUri || !videoUri || !location) {
    Alert.alert('Missing Information', 'Please ensure a photo, video, and location are all captured before submitting.');
    return;
  }

  setUploading(true);
  console.log("🚀 Starting report submission...");

  try {
    const ticketId = `TICKET_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
    console.log("Generated Ticket ID:", ticketId);

    // --- Upload Photo using fetch ---
    console.log("Uploading photo...");
    const photoResponse = await fetch(photoUri);
    const photoBlob = await photoResponse.blob();
    const photoRef = ref(storage, `reports/${ticketId}/photo.jpg`);
    await uploadBytes(photoRef, photoBlob);
    const photoUrl = await getDownloadURL(photoRef);
    console.log("✅ Photo uploaded, URL:", photoUrl);

    // --- Upload Video using fetch ---
    console.log("Uploading video...");
    const videoResponse = await fetch(videoUri);
    const videoBlob = await videoResponse.blob();
    const videoRef = ref(storage, `reports/${ticketId}/video.mp4`);
    await uploadBytes(videoRef, videoBlob);
    const videoUrl = await getDownloadURL(videoRef);
    console.log("✅ Video uploaded, URL:", videoUrl);

    // --- Save to Firestore ---
    console.log("Saving report data to Firestore...");
    const reportData = {
      ticketId: ticketId,
      photoUrl: photoUrl,
      videoUrl: videoUrl,
      location: new GeoPoint(location.coords.latitude, location.coords.longitude),
      timestamp: FieldValue.serverTimestamp(), // Correct way to use server timestamp
      status: 'pending',
    };

    await addDoc(collection(db, 'reports'), reportData);
    console.log("✅ Report data saved to Firestore");

    // --- Success ---
    Alert.alert(
      'Success',
      `Report submitted successfully!\nTicket ID: ${ticketId}`,
      [{ text: 'OK', onPress: () => navigation.goBack() }]
    );

  } catch (error) {
    // --- Comprehensive Error Handling ---
    console.error('❌ Error submitting report:', error);
    // The Firebase error from your logs will be caught here
    Alert.alert('Submission Error', `Failed to submit report: ${error.message}. Please check your network and try again.`);

  } finally {
    // --- Final Step: Always stop the loading indicator ---
    setUploading(false);
  }
};

  const startRecording = async () => {
    if (cameraRef.current) {
      try {
        setIsRecording(true);
        console.log("Starting video recording (muted)...");
        // --- Add mute: true to the options ---
        const videoRecordPromise = cameraRef.current.recordAsync({
          maxDuration: 30,
          quality: '720p',
          mute: true, // Attempt to record without audio
        });

        const video = await videoRecordPromise;
        console.log("Video recorded (muted):", video.uri);
        setVideoUri(video.uri);
        setIsRecording(false);
      } catch (error) {
        console.error('Error recording video:', error);
        // Provide specific feedback
        if (error.message && (error.message.includes('RECORD_AUDIO') || error.message.includes('Microphone'))) {
            Alert.alert(
                'Permission Error',
                'Recording failed, likely due to microphone permission. Please check your device settings and ensure microphone access is granted for this app, then try again. (Muted recording was attempted).'
            );
        } else {
            Alert.alert('Error', `Failed to record video: ${error.message || 'Unknown error'}. Please try again.`);
        }
        setIsRecording(false);
      }
    } else {
        console.log("Camera ref is not available for recording");
        Alert.alert('Error', 'Camera not ready for recording. Please try again.');
        setIsRecording(false);
    }
  };

  const stopRecording = async () => {
    if (cameraRef.current && isRecording) {
      console.log("Stopping video recording...");
      cameraRef.current.stopRecording();
    }
  };

  const retakePhoto = () => {
    setPhotoUri(null);
    setCurrentStep(1);
  };

  const retakeVideo = () => {
    setVideoUri(null);
    // Stay on step 2
  };

  // --- Permission Handling UI ---
  // Basic check for camera permission is usually sufficient.
  // The microphone permission request happens in useEffect.
  if (!cameraPermission) {
    return (
      <View style={styles.permissionContainer}>
        <Text>Requesting camera permission...</Text>
        <ActivityIndicator size="large" color="#007bff" />
      </View>
    );
  }

  if (!cameraPermission.granted) {
    return (
      <View style={styles.permissionContainer}>
        <Text style={styles.permissionText}>
          Camera permission is required to take photos and record videos.
        </Text>
        <TouchableOpacity
          style={styles.permissionButton}
          onPress={requestCameraPermission}
        >
          <Text style={styles.permissionButtonText}>Allow Camera</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.permissionButton, { backgroundColor: '#6c757d' }]}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.permissionButtonText}>Go Back</Text>
        </TouchableOpacity>
      </View>
    );
  }

  // --- Main UI Rendering ---
  return (
    <View style={styles.container}>
      {currentStep === 1 && (
        // Step 1: Take Photo
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 1: Take a Photo</Text>
          <Text style={styles.stepDescription}>
            Capture a clear photo of the issue you're reporting.
          </Text>

          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              ref={cameraRef}
              facing={cameraType}
              flash={flashMode}
            />
          </View>

          <TouchableOpacity
            style={styles.captureButton}
            onPress={takePicture}
            disabled={uploading}
          >
            <View style={styles.captureInnerButton} />
          </TouchableOpacity>
        </View>
      )}

      {currentStep === 2 && photoUri && !videoUri && (
        // Step 2: Record 360 Video
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 2: Record 360° Video</Text>
          <Text style={styles.stepDescription}>
            Stand still and slowly rotate your device to capture a 360-degree view.
            Tap and hold the red button to record (max 30 seconds).
          </Text>

          <View style={styles.previewContainer}>
            <Image source={{ uri: photoUri }} style={styles.previewImage} />
            <Text style={styles.previewText}>Photo Captured</Text>
          </View>

          <View style={styles.cameraContainer}>
            <CameraView
              style={styles.camera}
              ref={cameraRef}
              facing={cameraType}
              flash={flashMode}
              mode="video"
            />
          </View>

          <TouchableOpacity
            style={[
              styles.recordButton,
              isRecording && styles.recordingButton
            ]}
            onPressIn={startRecording}
            onPressOut={stopRecording}
            disabled={uploading}
          >
            <View style={[
              styles.recordInnerButton,
              isRecording && styles.recordingInnerButton
            ]} />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.retakeButton}
            onPress={retakePhoto}
            disabled={uploading}
          >
            <Text style={styles.retakeButtonText}>Retake Photo</Text>
          </TouchableOpacity>
        </View>
      )}

      {currentStep === 2 && photoUri && videoUri && (
        // Step 3: Review and Submit
        <View style={styles.stepContainer}>
          <Text style={styles.stepTitle}>Step 3: Review & Submit</Text>
          <Text style={styles.stepDescription}>
            Review your submission and submit the report.
          </Text>

          <ScrollView style={styles.reviewContainer}>

            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Photo:</Text>
              <Image source={{ uri: photoUri }} style={styles.reviewImage} />
            </View>

            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Video Preview:</Text>
              <Text style={styles.reviewText} numberOfLines={1} ellipsizeMode="middle">
                Video: {videoUri.split('/').pop()}
              </Text>
              <Video
                source={{ uri: videoUri }}
                style={styles.reviewVideo}
                useNativeControls
                resizeMode="contain"
                onError={(error) => console.error("Video playback error:", error)}
              />
            </View>

            {location && (
              <View style={styles.reviewItem}>
                <Text style={styles.reviewLabel}>Location:</Text>
                <Text style={styles.reviewText}>
                  Lat: {location.coords.latitude.toFixed(6)},
                  Lng: {location.coords.longitude.toFixed(6)}
                </Text>
              </View>
            )}

            <View style={styles.reviewItem}>
              <Text style={styles.reviewLabel}>Submission Time:</Text>
              <Text style={styles.reviewText}>
                {new Date().toLocaleString()}
              </Text>
            </View>
          </ScrollView>

          <View style={styles.buttonRow}>
            <TouchableOpacity
              style={styles.retakeButton}
              onPress={retakeVideo}
              disabled={uploading}
            >
              <Text style={styles.retakeButtonText}>Retake Video</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.submitButton}
              onPress={submitReport}
              disabled={uploading}
            >
              {uploading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.submitButtonText}>Submit Report</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>
      )}
    </View>
  );
}
// --- Styles remain the same ---
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  permissionText: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  permissionButton: {
    backgroundColor: '#007bff',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    marginBottom: 15,
    minWidth: '60%',
    alignItems: 'center',
  },
  permissionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
  stepContainer: {
    flex: 1,
    padding: 15,
  },
  stepTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 10,
    color: '#333',
  },
  stepDescription: {
    fontSize: 15,
    textAlign: 'center',
    marginBottom: 15,
    color: '#666',
    lineHeight: 20,
  },
  cameraContainer: {
    flex: 1,
    borderRadius: 10,
    overflow: 'hidden',
    marginBottom: 15,
    backgroundColor: 'black',
  },
  camera: {
    flex: 1,
  },
  captureButton: {
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  captureInnerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#aaa',
  },
  recordButton: {
    alignSelf: 'center',
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  recordingButton: {
    backgroundColor: 'rgba(255, 0, 0, 0.2)',
  },
  recordInnerButton: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: '#fff',
    borderWidth: 2,
    borderColor: '#aaa',
  },
  recordingInnerButton: {
    width: 30,
    height: 30,
    borderRadius: 5,
    backgroundColor: 'red',
    borderWidth: 0,
  },
  previewContainer: {
    alignItems: 'center',
    marginBottom: 15,
  },
  previewImage: {
    width: 100,
    height: 100,
    borderRadius: 10,
    marginBottom: 5,
  },
  previewText: {
    fontSize: 14,
    color: '#333',
    fontWeight: '500',
  },
  reviewContainer: {
    flex: 1,
  },
  reviewItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
  },
  reviewLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 5,
    color: '#333',
  },
  reviewImage: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    resizeMode: 'cover',
    marginBottom: 5,
  },
  reviewVideo: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    backgroundColor: 'black',
  },
  reviewText: {
    fontSize: 14,
    color: '#555',
    marginTop: 2,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 10,
  },
  retakeButton: {
    backgroundColor: '#6c757d',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginRight: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  retakeButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
  submitButton: {
    backgroundColor: '#28a745',
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
    flex: 1,
    marginLeft: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: 'bold',
  },
});
