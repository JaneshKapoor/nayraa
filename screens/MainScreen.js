// screens/MainScreen.js
import React, { useState, useEffect } from 'react';
import Constants from 'expo-constants';
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  Alert,
  Dimensions,
  Keyboard,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');
// Access the API key from app.config.js via Constants
const apiKey = Constants.expoConfig?.extra?.GOOGLE_MAPS_API_KEY || 'YOUR_FALLBACK_API_KEY';

export default function MainScreen({ navigation }) {
  const [searchText, setSearchText] = useState('');
  const [region, setRegion] = useState({
    latitude: 37.7749,
    longitude: -122.4194,
    latitudeDelta: 0.0922,
    longitudeDelta: 0.0421,
  });
  const [marker, setMarker] = useState(null);
  const [summary, setSummary] = useState('Search for a location to see details');
  const [errorMsg, setErrorMsg] = useState(null);

  // New state to track user role
  const [userRole, setUserRole] = useState('none'); // 'user' or 'technician'

  useEffect(() => {
    (async () => {
      let { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        setErrorMsg('Permission to access location was denied');
        Alert.alert('Permission Denied', 'Location access is required for this app.');
        return;
      }

      try {
        let location = await Location.getCurrentPositionAsync({});
        setRegion({
          latitude: location.coords.latitude,
          longitude: location.coords.longitude,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });
      } catch (error) {
        console.error("Error getting current location:", error);
        setErrorMsg('Could not get current location.');
      }
    })();
  }, []);

  const searchLocation = async () => {
    if (!searchText.trim()) {
      Alert.alert('Please enter a location');
      return;
    }

    if (!apiKey || apiKey === 'YOUR_FALLBACK_API_KEY') {
        Alert.alert('Configuration Error', 'Google Maps API key is missing. Please check your configuration.');
        console.error("Google Maps API key is missing!");
        return;
    }

    try {
      // Encode the search text for the URL
      const encodedSearchText = encodeURIComponent(searchText);
      const url = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedSearchText}&key=${apiKey}`;

      console.log("Fetching from URL:", url); // Debugging log

      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Network response was not ok: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      console.log("Geocode API Response:", data); // Debugging log

      if (data.results && data.results.length > 0) {
        const location = data.results[0].geometry.location;
        const formattedAddress = data.results[0].formatted_address;

        setRegion({
          latitude: location.lat,
          longitude: location.lng,
          latitudeDelta: 0.0922,
          longitudeDelta: 0.0421,
        });

        setMarker({
          latitude: location.lat,
          longitude: location.lng,
        });

        setSummary(`Location: ${formattedAddress}\nCoordinates: ${location.lat.toFixed(6)}, ${location.lng.toFixed(6)}`);
        Keyboard.dismiss();
      } else {
        Alert.alert('Location not found', 'Please try a different search term');
        console.log("No results found for search:", searchText); // Debugging log
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', `Failed to search location: ${error.message}. Please try again.`);
    }
  };

  const handleMapRegionChange = (newRegion) => {
    // Optional: Update region state if user pans/zooms manually
    // setRegion(newRegion);
    // For now, we keep the region update primarily through search/location
  };

  // Handle button press for switching roles
  const handleUserRoleChange = (role) => {
    setUserRole(role);
    if (role === 'user') {
      navigation.navigate('UserFlow');
    } else if (role === 'technician') {
      Alert.alert('Feature Coming Soon', 'Technician mode is not implemented yet.');
      // You can navigate to a TechnicianFlow screen here later
      // navigation.navigate('TechnicianFlow');
    }
    // Reset other states if needed for a clean slate on role change
    // setSearchText('');
    // setSummary('Search for a location to see details');
    // setMarker(null);
  };

  return (
    <View style={styles.container}>
      {/* App Title */}
      <View style={styles.titleContainer}>
        <Text style={styles.title}>Nyra</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search for a location..."
          value={searchText}
          onChangeText={setSearchText}
          onSubmitEditing={searchLocation}
          returnKeyType="search"
        />
      </View>

      {/* Map View - Takes remaining space above summary/buttons */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={handleMapRegionChange}
          rotateEnabled={true}
          showsUserLocation={true} // Show user's location dot
        >
          {marker && <Marker coordinate={marker} />}
        </MapView>
      </View>

      {/* Summary Section */}
      <View style={styles.summaryContainer}>
        <ScrollView>
          <Text style={styles.summaryTitle}>Location Summary</Text>
          <Text style={styles.summaryText}>{summary}</Text>
        </ScrollView>
      </View>

      {/* Role Selection Buttons - Fixed at the bottom */}
      <View style={styles.roleButtonsContainer}>
        <TouchableOpacity
          style={[
            styles.roleButton,
            userRole === 'user' && styles.activeRoleButton,
          ]}
          onPress={() => handleUserRoleChange('user')}
        >
          <Text style={styles.roleButtonText}>User</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[
            styles.roleButton,
            userRole === 'technician' && styles.activeRoleButton,
          ]}
          onPress={() => handleUserRoleChange('technician')}
        >
          <Text style={styles.roleButtonText}>Technician</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  titleContainer: {
    alignItems: 'center',
    backgroundColor: '#f8f8f8',
    paddingVertical: 15,
    // Removed marginTop as it's not needed with SafeAreaProvider handling top padding
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
  },
  searchContainer: {
    paddingHorizontal: 15,
    backgroundColor: '#f8f8f8',
    // borderBottomWidth: 1,
    // borderBottomColor: '#ddd',
    paddingBottom: 15,
  },
  searchInput: {
    height: 50,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 25,
    paddingHorizontal: 20,
    fontSize: 16,
    backgroundColor: 'white',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  mapContainer: {
    flex: 1, // Takes remaining space
  },
  map: {
    flex: 1,
  },
  summaryContainer: {
    maxHeight: height * 0.25, // Limit summary height
    padding: 15,
    backgroundColor: '#f0f0f0',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 22,
    color: '#666',
  },
  roleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingVertical: 15,
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#ddd',
  },
  roleButton: {
    backgroundColor: '#ccc',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    minWidth: '40%',
    alignItems: 'center',
  },
  activeRoleButton: {
    backgroundColor: '#007bff',
  },
  roleButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});