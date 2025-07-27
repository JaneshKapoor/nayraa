// App.js
import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import MainScreen from './screens/MainScreen'; // Check this path is correct
import UserFlow from './screens/UserFlow';     // Check this path is correct

import { SafeAreaProvider } from 'react-native-safe-area-context';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <Stack.Navigator
          initialRouteName="Main" // This must match the 'name' prop of the screen below
          screenOptions={{
            headerShown: false,
          }}
        >
          {/* The 'name' prop here defines the route name */}
          <Stack.Screen name="Main" component={MainScreen} />
          <Stack.Screen name="UserFlow" component={UserFlow} />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}