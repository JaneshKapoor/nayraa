// firebaseConfig.js
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getStorage, ref } from 'firebase/storage'; // Simplified import

const firebaseConfig = {
  apiKey: "AIzaSyC6BIobgGFQwoHyG5ZV2iDUa5KQ4qZFqZo",
  authDomain: "nyra-16aba.firebaseapp.com",
  projectId: "nyra-16aba",
  storageBucket: "nyra-16aba.firebasestorage.app", // Double-check this in Firebase Console
  messagingSenderId: "661473703016",
  appId: "1:661473703016:web:c11c825739199be3a337dd",
  measurementId: "G-GLX64GV2TG"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firestore and Storage
const db = getFirestore(app);
const storage = getStorage(app); // This should initialize correctly

async function testFirebase() {
  try {
    // ✅ Test Firestore
    console.log("Testing Firestore connection...");
    const snapshot = await getDocs(collection(db, "reports"));
    console.log("✅ Firestore connected successfully. Total reports found:", snapshot.size);

  } catch (firestoreError) {
    console.error("❌ Error connecting to Firestore:", firestoreError);
  }

  try {
    // ✅ Test Storage Initialization and Basic Reference Creation
    console.log("Testing Firebase Storage initialization...");
    // Just creating a reference should not throw an error if the app/bucket is configured correctly
    const testRef = ref(storage, 'test-path/test-file.txt');
    console.log("✅ Firebase Storage initialized and reference created successfully:", testRef.toString());

    // Optional: If you want to test listing, try a safer path or handle errors more specifically
    // For now, let's skip the listAll test which might be causing the issue.

  } catch (storageError) {
    console.error("❌ Error initializing or connecting to Firebase Storage:", storageError);
    console.error("Error Details:", storageError.code, storageError.message);
    // Check if it's related to the bucket name
    if (storageError.message && storageError.message.includes('bucket')) {
        console.error("💡 This might indicate an incorrect storageBucket name in your config.");
    }
  }
}

// Run the test when the module is imported
testFirebase();

export { db, storage };
