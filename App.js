import React, { useState, useEffect } from 'react';
import Constants from 'expo-constants';
const apiKey = Constants.expoConfig.extra.GOOGLE_MAPS_API_KEY;
import {
  StyleSheet,
  View,
  TextInput,
  Text,
  Alert,
  Dimensions,
  Keyboard,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker } from 'react-native-maps';
import * as Location from 'expo-location';

const { width, height } = Dimensions.get('window');

export default function App() {
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
        return;
      }

      let location = await Location.getCurrentPositionAsync({});
      setRegion({
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
        latitudeDelta: 0.0922,
        longitudeDelta: 0.0421,
      });
    })();
  }, []);

  const searchLocation = async () => {
    if (!searchText.trim()) {
      Alert.alert('Please enter a location');
      return;
    }

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/geocode/json?address=${encodeURIComponent(
          searchText
        )}&key=${apiKey}`
      );

      const data = await response.json();

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

        setSummary(`Location: ${formattedAddress}\nCoordinates: ${location.lat}, ${location.lng}`);
        Keyboard.dismiss();
      } else {
        Alert.alert('Location not found', 'Please try a different search term');
      }
    } catch (error) {
      console.error('Error searching location:', error);
      Alert.alert('Error', 'Failed to search location. Please try again.');
    }
  };

  const handleMapRegionChange = (newRegion) => {
    // Check if the new region is different from the current region
    // We want to prevent resetting during user-initiated rotation
    if (newRegion.latitude !== region.latitude || newRegion.longitude !== region.longitude) {
      setRegion(newRegion); // Update the region only if it's different
    }
  };

  // Handle button press for switching roles
  const handleUserRoleChange = (role) => {
    setUserRole(role);
    // Reset other states if needed
    setSearchText('');
    setSummary('Search for a location to see details');
    setMarker(null);
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

      {/* Map View - 60% of screen height */}
      <View style={styles.mapContainer}>
        <MapView
          style={styles.map}
          region={region}
          onRegionChangeComplete={handleMapRegionChange}
          rotateEnabled={true} // Keep map rotation enabled
        >
          {marker && <Marker coordinate={marker} />}
        </MapView>
      </View>

      {/* Summary Section - 40% of screen height */}
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Location Summary</Text>
        <Text style={styles.summaryText}>{summary}</Text>
      </View>

      {/* Role Selection Buttons */}
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
    marginTop: 25, // Keep as is
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
  },
  searchContainer: {
    padding: 15,
    backgroundColor: '#f8f8f8',
    borderBottomWidth: 1,
    borderBottomColor: '#ddd',
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
    height: height * 0.6,
  },
  map: {
    flex: 1,
  },
  summaryContainer: {
    flex: 1,
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  summaryText: {
    fontSize: 16,
    lineHeight: 24,
    color: '#666',
  },
  roleButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginHorizontal: 20,
    marginBottom: 20,
  },
  roleButton: {
    backgroundColor: '#ccc',
    padding: 10,
    borderRadius: 5,
    width: '40%',
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