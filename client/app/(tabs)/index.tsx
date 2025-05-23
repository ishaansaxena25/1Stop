// import { SERVER_URL, GOOGLE_API_KEY } from "@env";
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  ScrollView,
  TouchableOpacity,
  Modal,
  SafeAreaView,
  KeyboardAvoidingView,
  Platform,
  TouchableWithoutFeedback,
  Keyboard,
  FlatList,
  Alert,
  ActivityIndicator,
  Dimensions,
  ScrollView as RNScrollView,
  Image,
} from "react-native";
import React, {
  useRef,
  useState,
  useCallback,
  useMemo,
  useEffect,
} from "react";
import { Ionicons, MaterialIcons } from "@expo/vector-icons";
import { LinearGradient } from "expo-linear-gradient";
import MyMap, { MyMapRef } from "@/components/MyMap";

// Google Places API key - should be stored in environment variables in production
const GOOGLE_PLACES_API_KEY = "//";

const Bus = () => {
  const mapRef = useRef<MyMapRef>(null);
  const [searchModalVisible, setSearchModalVisible] = useState(false);
  // Add new state for payment modal
  const [paymentModalVisible, setPaymentModalVisible] = useState(false);
  const [formState, setFormState] = useState({
    fromLocation: "",
    toLocation: "",
  });
  const [inputState, setInputState] = useState({
    fromEditable: true,
    toEditable: true,
  });
  const [routeConfirmed, setRouteConfirmed] = useState(false);
  const [fromSuggestions, setFromSuggestions] = useState<string[]>([]);
  const [toSuggestions, setToSuggestions] = useState<string[]>([]);
  const [distance, setDistance] = useState("");
  const [duration, setDuration] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [routeOptions, setRouteOptions] = useState<
    Array<{
      distance: string;
      duration: string;
      description: string;
    }>
  >([]);
  // Add payment amount state - calculate based on distance
  const [paymentAmount, setPaymentAmount] = useState("0");

  // Function to fetch place predictions from Google Places API
  const fetchPlacePredictions = async (input: string): Promise<string[]> => {
    if (input.length <= 2) return [];

    try {
      const response = await fetch(
        `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${input}&types=transit_station|bus_station&components=country:in&key=${GOOGLE_PLACES_API_KEY}`
      );
      console.log(response);
      const result = await response.json();
      console.log(result);
      if (result.status === "OK") {
        return result.predictions.map((pred: any) => pred.description);
      } else {
        return [];
      }
    } catch (error) {
      console.error("Error fetching place predictions:", error);
      return [];
    }
  };

  // Handle from location input with API suggestions
  const handleFromChange = useCallback(async (text: string) => {
    setFormState((prev) => ({ ...prev, fromLocation: text }));

    try {
      if (text.length > 2) {
        setLoading(true);
        const suggestions = await fetchPlacePredictions(text);
        setFromSuggestions(suggestions.slice(0, 5));
      } else {
        setFromSuggestions([]);
      }
    } catch (error) {
      console.error("Error in handleFromChange:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Handle to location input with API suggestions
  const handleToChange = useCallback(async (text: string) => {
    setFormState((prev) => ({ ...prev, toLocation: text }));

    try {
      if (text.length > 2) {
        setLoading(true);
        const suggestions = await fetchPlacePredictions(text);
        setToSuggestions(suggestions.slice(0, 5));
      } else {
        setToSuggestions([]);
      }
    } catch (error) {
      console.error("Error in handleToChange:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  // Select suggestion handlers - update to make inputs read-only after selection
  const selectFromSuggestion = useCallback((suggestion: string) => {
    setFormState((prev) => ({ ...prev, fromLocation: suggestion }));
    setFromSuggestions([]);
    setInputState((prev) => ({ ...prev, fromEditable: false }));
    Keyboard.dismiss();
  }, []);

  const selectToSuggestion = useCallback((suggestion: string) => {
    setFormState((prev) => ({ ...prev, toLocation: suggestion }));
    setToSuggestions([]);
    setInputState((prev) => ({ ...prev, toEditable: false }));
    Keyboard.dismiss();
  }, []);

  // Clear handlers for resetting inputs to editable state
  const clearFromLocation = useCallback(() => {
    setFormState((prev) => ({ ...prev, fromLocation: "" }));
    setInputState((prev) => ({ ...prev, fromEditable: true }));
  }, []);

  const clearToLocation = useCallback(() => {
    setFormState((prev) => ({ ...prev, toLocation: "" }));
    setInputState((prev) => ({ ...prev, toEditable: true }));
  }, []);

  const handleConfirmRoute = useCallback(async () => {
    if (formState.fromLocation && formState.toLocation) {
      // Check if origin and destination are the same
      if (formState.fromLocation === formState.toLocation) {
        setError("Origin and destination cannot be the same");
        return;
      }

      setError(null);
      setLoading(true);

      try {
        // Use the MyMap component's findRoute function to get actual route info
        const routeResult = await mapRef.current?.findRoute(
          formState.fromLocation,
          formState.toLocation
        );
      
        if (routeResult) {
          setDistance(routeResult.distance);
          setDuration(routeResult.duration);
      
          // Calculate fare based on distance
          const baseDistance = parseFloat(
            routeResult.distance.replace(/[^0-9.]/g, "")
          );
      
          // Set payment amount based on distance (₹20 base + ₹5 per km)
          setPaymentAmount((20 + baseDistance * 5).toFixed(0));
      
          // Generate some route options based on the actual route
          // In a real app, these would come from the API
          const baseDuration = parseInt(routeResult.duration.replace(/[^0-9]/g, ""));
      
          setRouteOptions([
            {
              distance: routeResult.distance,
              duration: routeResult.duration,
              description: "Direct Route",
            },
            {
              distance: `${(baseDistance * 1.1).toFixed(1)}km`,
              duration: `${Math.round(baseDuration * 0.9)} mins`,
              description: "Faster Route (Less Stops)",
            },
            {
              distance: `${(baseDistance * 0.95).toFixed(1)}km`,
              duration: `${Math.round(baseDuration * 1.15)} mins`,
              description: "Scenic Route",
            },
          ]);
      
          setRouteConfirmed(true);
          setSearchModalVisible(false);
        } else {
          setError("Could not calculate route. Please try different locations.");
        }
      } catch (error) {
        console.error("Error confirming route:", error);
        setError("Failed to calculate route. Please try again.");
      } finally {
        setLoading(false);
        Keyboard.dismiss();
      }
      
    }
  }, [formState]);

  // Handle opening payment modal
  const handleBookTicket = useCallback(() => {
    setPaymentModalVisible(true);
  }, []);

  // Handle closing payment modal
  const closePaymentModal = useCallback(() => {
    setPaymentModalVisible(false);
  }, []);

  // Handle payment process
  const handlePayment = useCallback((method: string) => {
    // Show processing state
    Alert.alert(
      "Processing Payment",
      `Processing your payment of ₹${paymentAmount} via ${method}...`,
      [
        {
          text: "OK",
          onPress: () => {
            // Simulate successful payment
            setTimeout(() => {
              Alert.alert(
                "Payment Successful!",
                "Your ticket has been booked successfully.",
                [
                  {
                    text: "View Ticket",
                    onPress: () => {
                      // Navigate to ticket view (would be implemented in a real app)
                      closePaymentModal();
                    },
                  },
                ]
              );
            }, 1500);
          },
        },
      ]
    );
  }, [paymentAmount, closePaymentModal]);

  const handleEditRoute = useCallback(() => {
    setSearchModalVisible(true);
  }, []);

  const openSearchModal = useCallback(() => {
    setSearchModalVisible(true);
  }, []);

  const closeSearchModal = useCallback(() => {
    Keyboard.dismiss();
    setSearchModalVisible(false);
  }, []);

  // Helper function to truncate long text with ellipsis
  const truncateText = (text: string, maxLength: number = 30): string => {
    if (!text) return "";
    if (text.length <= maxLength) return text;

    // Find the last space before maxLength to avoid cutting words
    const lastSpace = text.substring(0, maxLength).lastIndexOf(" ");
    return text.substring(0, lastSpace > 0 ? lastSpace : maxLength) + "...";
  };

  // Swap origin and destination locations
  const handleSwapLocations = useCallback(() => {
    setFormState((prev) => ({
      fromLocation: prev.toLocation,
      toLocation: prev.fromLocation,
    }));
    // Keep the input state (editable or not) when swapping
    setInputState((prev) => ({
      fromEditable: prev.toEditable,
      toEditable: prev.fromEditable,
    }));
    setFromSuggestions([]);
    setToSuggestions([]);
  }, []);

  // Select a specific route option
  const selectRouteOption = useCallback((option: any) => {
    setDistance(option.distance);
    setDuration(option.duration);
    // In a real app, you would call findRoute again with specific parameters for this route
  }, []);

  // Extract common view elements for reuse
  const mapSection = useMemo(
    () => (
      <View className="w-full h-1/2 bg-gray-900 justify-center items-center">
        <MyMap ref={mapRef} />
      </View>
    ),
    []
  );

  const locateButton = useMemo(
    () => (
      <TouchableOpacity
        className="absolute right-4 bottom-[51%] bg-black p-3 rounded-full shadow-lg"
        onPress={() => mapRef.current?.locateMe()}
      >
        <Ionicons name="locate" size={24} color="#22c55e" />
      </TouchableOpacity>
    ),
    []
  );

  // Update the Modal content to include suggestions with loading state
  const modalContent = useMemo(
    () => (
      <Modal
        animationType="slide"
        transparent={false}
        visible={true}
        onRequestClose={closeSearchModal}
      >
        <LinearGradient
          colors={["#000000", "#0f172a"]}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          className="flex-1"
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === "ios" ? "padding" : "height"}
            className="flex-1"
          >
            <SafeAreaView className="flex-1 pt-10">
              {/* Header Section */}
              <View className="px-5 py-4 flex-row items-center border-b border-gray-800 mb-2">
                <TouchableOpacity
                  onPress={closeSearchModal}
                  className="mr-4 bg-gray-800 p-2 rounded-full"
                  hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                >
                  <Ionicons name="arrow-back" size={22} color="#22c55e" />
                </TouchableOpacity>
                <Text className="text-xl font-bold text-white">
                  Plan Your Trip
                </Text>
              </View>

              {/* Use View instead of ScrollView to fix nesting error */}
              <View className="flex-1 px-5">
                {/* Error Message */}
                {error && (
                  <View className="bg-red-900/80 p-4 rounded-xl mb-4 shadow-md">
                    <Text className="text-white font-medium text-center">
                      {error}
                    </Text>
                  </View>
                )}

                {/* Route Planning Card */}
                <View className="bg-gray-900/80 rounded-xl shadow-xl overflow-hidden mb-6">
                  {/* Card Header */}
                  <View className="bg-gray-800/80 px-4 py-3 border-b border-gray-700">
                    <Text className="text-white font-semibold">
                      Enter Your Route Details
                    </Text>
                  </View>

                  {/* From Location Input */}
                  <View className="px-4 pt-4">
                    <Text className="text-gray-400 mb-1 text-xs font-medium uppercase tracking-wider">
                      From
                    </Text>
                    <View className="bg-gray-800 rounded-lg mb-2 overflow-hidden">
                      <View className="flex-row items-center px-3 py-3">
                        <Ionicons name="location" size={20} color="#22c55e" />
                        {inputState.fromEditable ? (
                          <TextInput
                            className="ml-3 flex-1 text-white text-base"
                            placeholder="Starting point..."
                            placeholderTextColor="gray"
                            value={formState.fromLocation}
                            onChangeText={handleFromChange}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        ) : (
                          <RNScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="ml-3 flex-1"
                          >
                            <Text className="text-white text-base py-1">
                              {formState.fromLocation}
                            </Text>
                          </RNScrollView>
                        )}
                        {formState.fromLocation.length > 0 && (
                          <TouchableOpacity
                            onPress={clearFromLocation}
                            hitSlop={{
                              top: 10,
                              bottom: 10,
                              left: 10,
                              right: 10,
                            }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color="gray"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Suggestions container for From Location - outside of any ScrollView */}
                  {fromSuggestions.length > 0 && (
                    <View className="px-4">
                      <View className="bg-gray-800/80 rounded-lg mb-4 overflow-hidden shadow-inner">
                        {fromSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={`from-${index}`}
                            onPress={() => selectFromSuggestion(item)}
                            className="px-4 py-3 border-t border-gray-700 flex-row items-center"
                          >
                            <Ionicons
                              name="bus-outline"
                              size={16}
                              color="#22c55e"
                            />
                            <Text className="text-white ml-2 flex-1">
                              {item}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}

                  {/* Route Connector - now with a working swap button */}
                  <View className="px-4 flex-row items-center py-2">
                    <View className="w-0.5 h-6 bg-gray-700 ml-2.5" />
                    <TouchableOpacity
                      className="flex-1 items-center"
                      onPress={handleSwapLocations}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <View className="bg-gray-800 p-2 rounded-full">
                        <Ionicons
                          name="swap-vertical"
                          size={20}
                          color="#22c55e"
                        />
                      </View>
                    </TouchableOpacity>
                  </View>

                  {/* To Location Input */}
                  <View className="px-4 pb-4">
                    <Text className="text-gray-400 mb-1 text-xs font-medium uppercase tracking-wider">
                      To
                    </Text>
                    <View className="bg-gray-800 rounded-lg mb-2 overflow-hidden">
                      <View className="flex-row items-center px-3 py-3">
                        <Ionicons name="navigate" size={20} color="#22c55e" />
                        {inputState.toEditable ? (
                          <TextInput
                            className="ml-3 flex-1 text-white text-base"
                            placeholder="Destination..."
                            placeholderTextColor="gray"
                            value={formState.toLocation}
                            onChangeText={handleToChange}
                            autoCapitalize="none"
                            autoCorrect={false}
                          />
                        ) : (
                          <RNScrollView
                            horizontal
                            showsHorizontalScrollIndicator={false}
                            className="ml-3 flex-1"
                          >
                            <Text className="text-white text-base py-1">
                              {formState.toLocation}
                            </Text>
                          </RNScrollView>
                        )}
                        {formState.toLocation.length > 0 && (
                          <TouchableOpacity
                            onPress={clearToLocation}
                            hitSlop={{
                              top: 10,
                              bottom: 10,
                              left: 10,
                              right: 10,
                            }}
                          >
                            <Ionicons
                              name="close-circle"
                              size={18}
                              color="gray"
                            />
                          </TouchableOpacity>
                        )}
                      </View>
                    </View>
                  </View>

                  {/* Suggestions container for To Location - outside of any ScrollView */}
                  {toSuggestions.length > 0 && (
                    <View className="px-4">
                      <View className="bg-gray-800/80 rounded-lg mb-4 overflow-hidden shadow-inner">
                        {toSuggestions.map((item, index) => (
                          <TouchableOpacity
                            key={`to-${index}`}
                            onPress={() => selectToSuggestion(item)}
                            className="px-4 py-3 border-t border-gray-700 flex-row items-center"
                          >
                            <Ionicons
                              name="bus-outline"
                              size={16}
                              color="#22c55e"
                            />
                            <Text className="text-white ml-2 flex-1">
                              {item}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>
                  )}
                </View>

                {/* Action Button */}
                <TouchableOpacity
                  className={`py-4 rounded-xl mb-6 shadow-lg overflow-hidden ${
                    !formState.fromLocation || !formState.toLocation || loading
                      ? "bg-gray-700"
                      : "bg-green-600"
                  }`}
                  onPress={handleConfirmRoute}
                  disabled={
                    !formState.fromLocation || !formState.toLocation || loading
                  }
                >
                  {loading ? (
                    <View className="flex-row justify-center items-center">
                      <ActivityIndicator size="small" color="#ffffff" />
                      <Text className="text-white font-bold ml-2">
                        Calculating...
                      </Text>
                    </View>
                  ) : (
                    <Text className="text-white font-bold text-center text-base">
                      Find My Route
                    </Text>
                  )}
                </TouchableOpacity>

                {/* Info Card */}
                <View className="bg-gray-900/80 rounded-xl p-4 mb-6">
                  <View className="flex-row items-center mb-3">
                    <Ionicons
                      name="information-circle"
                      size={22}
                      color="#22c55e"
                    />
                    <Text className="text-white font-medium ml-2">
                      About Bus Routes
                    </Text>
                  </View>
                  <Text className="text-gray-400 text-sm">
                    We provide direct bus routes between specified locations in
                    Bangalore. Our suggestions are based on BMTC schedules and
                    real-time data.
                  </Text>
                </View>

                {/* Help and Tips */}
                <View className="bg-gray-900/80 rounded-xl p-4 mb-10">
                  <Text className="text-white font-medium mb-3">
                    Quick Tips
                  </Text>
                  <View className="flex-row items-start mb-2">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#22c55e"
                      className="mt-0.5"
                    />
                    <Text className="text-gray-400 text-sm ml-2 flex-1">
                      Enter major bus stops for better results
                    </Text>
                  </View>
                  <View className="flex-row items-start mb-2">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#22c55e"
                      className="mt-0.5"
                    />
                    <Text className="text-gray-400 text-sm ml-2 flex-1">
                      Select from suggested locations for accuracy
                    </Text>
                  </View>
                  <View className="flex-row items-start">
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color="#22c55e"
                      className="mt-0.5"
                    />
                    <Text className="text-gray-400 text-sm ml-2 flex-1">
                      Try nearby stops if no direct routes are found
                    </Text>
                  </View>
                </View>
              </View>
            </SafeAreaView>
          </KeyboardAvoidingView>
        </LinearGradient>
      </Modal>
    ),
    [
      formState,
      fromSuggestions,
      toSuggestions,
      handleFromChange,
      handleToChange,
      selectFromSuggestion,
      selectToSuggestion,
      handleConfirmRoute,
      closeSearchModal,
      loading,
      error,
      handleSwapLocations,
      inputState,
      clearFromLocation,
      clearToLocation,
    ]
  );

  // Payment modal component
  const paymentModalContent = useMemo(
    () => (
      <Modal
        animationType="slide"
        transparent={true}
        visible={paymentModalVisible}
        onRequestClose={closePaymentModal}
      >
        <TouchableWithoutFeedback onPress={closePaymentModal}>
          <View className="flex-1 justify-end bg-black/50">
            <TouchableWithoutFeedback onPress={e => e.stopPropagation()}>
              <LinearGradient
                colors={["#0f172a", "#000000"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 0, y: 1 }}
                className="rounded-t-3xl p-5 h-3/4"
              >
                <SafeAreaView className="flex-1">
                  <View className="flex-row justify-between items-center mb-6">
                    <Text className="text-xl font-bold text-white">Payment</Text>
                    <TouchableOpacity 
                      onPress={closePaymentModal}
                      className="bg-gray-800 p-2 rounded-full"
                    >
                      <Ionicons name="close" size={22} color="#22c55e" />
                    </TouchableOpacity>
                  </View>

                  <View className="bg-gray-900/80 p-4 rounded-xl mb-5 shadow-lg">
                    <Text className="text-white text-base mb-1">Trip Summary</Text>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-gray-400">From</Text>
                      <Text className="text-white text-right flex-1 ml-4">{truncateText(formState.fromLocation, 25)}</Text>
                    </View>
                    <View className="flex-row justify-between mb-2">
                      <Text className="text-gray-400">To</Text>
                      <Text className="text-white text-right flex-1 ml-4">{truncateText(formState.toLocation, 25)}</Text>
                    </View>
                    <View className="flex-row justify-between pt-2 border-t border-gray-800">
                      <Text className="text-gray-400">Distance</Text>
                      <Text className="text-white">{distance}</Text>
                    </View>
                  </View>

                  <View className="bg-gray-900/80 p-4 rounded-xl mb-6 shadow-lg">
                    <View className="flex-row justify-between items-center mb-4">
                      <Text className="text-white text-base">Fare Details</Text>
                      <View className="bg-green-900/50 px-3 py-1 rounded-full">
                        <Text className="text-green-500 font-medium">₹{paymentAmount}</Text>
                      </View>
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-400">Base Fare</Text>
                      <Text className="text-white">₹20.00</Text>
                    </View>
                    <View className="flex-row justify-between mb-1">
                      <Text className="text-gray-400">Distance Charge</Text>
                      <Text className="text-white">₹{(parseFloat(paymentAmount) - 20).toFixed(2)}</Text>
                    </View>
                    <View className="flex-row justify-between pt-2 border-t border-gray-800">
                      <Text className="text-gray-400">Total Amount</Text>
                      <Text className="text-white font-bold">₹{paymentAmount}.00</Text>
                    </View>
                  </View>

                  <Text className="text-lg font-semibold text-white mb-4">Payment Methods</Text>
                  
                  <TouchableOpacity 
                    className="bg-gray-900 border border-gray-800 p-4 rounded-xl mb-3 flex-row items-center"
                    onPress={() => handlePayment("UPI")}
                  >
                    <Image 
                      source={{uri: 'https://upload.wikimedia.org/wikipedia/commons/thumb/e/e1/UPI-Logo-vector.svg/1200px-UPI-Logo-vector.svg.png'}} 
                      style={{width: 35, height: 35}} 
                      className="rounded-md"
                    />
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-medium">UPI Payment</Text>
                      <Text className="text-gray-400 text-sm">Pay using any UPI app</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#22c55e" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    className="bg-gray-900 border border-gray-800 p-4 rounded-xl mb-3 flex-row items-center"
                    onPress={() => handlePayment("Card")}
                  >
                    <View className="w-9 h-9 bg-gray-800 rounded-md items-center justify-center">
                      <Ionicons name="card-outline" size={22} color="#22c55e" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-medium">Credit/Debit Card</Text>
                      <Text className="text-gray-400 text-sm">Visa, Mastercard, RuPay</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#22c55e" />
                  </TouchableOpacity>

                  <TouchableOpacity 
                    className="bg-gray-900 border border-gray-800 p-4 rounded-xl mb-3 flex-row items-center"
                    onPress={() => handlePayment("Cash")}
                  >
                    <View className="w-9 h-9 bg-gray-800 rounded-md items-center justify-center">
                      <Ionicons name="cash-outline" size={22} color="#22c55e" />
                    </View>
                    <View className="ml-3 flex-1">
                      <Text className="text-white font-medium">Cash Payment</Text>
                      <Text className="text-gray-400 text-sm">Pay when you board</Text>
                    </View>
                    <Ionicons name="chevron-forward" size={20} color="#22c55e" />
                  </TouchableOpacity>

                </SafeAreaView>
              </LinearGradient>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    ),
    [paymentModalVisible, closePaymentModal, formState, distance, paymentAmount, handlePayment]
  );

  // If route is confirmed, show the route view
  if (routeConfirmed) {
    return (
      <View className="flex-1 bg-black">
        {mapSection}
        {locateButton}

        <View className="w-full h-1/2 bg-black p-4">
          <View className="bg-gray-900 border border-gray-800 p-4 rounded-lg mb-4">
            <View className="flex-row justify-between mb-2">
              <Text className="text-lg font-semibold text-white">
                Your Route
              </Text>
              <TouchableOpacity
                onPress={handleEditRoute}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Ionicons name="pencil" size={20} color="#22c55e" />
              </TouchableOpacity>
            </View>

            <View className="mb-2">
              <Text className="text-gray-400">From</Text>
              <Text className="text-white">
                {truncateText(formState.fromLocation, 40)}
              </Text>
            </View>

            <View>
              <Text className="text-gray-400">To</Text>
              <Text className="text-white">
                {truncateText(formState.toLocation, 40)}
              </Text>
            </View>

            <View className="flex-row justify-between mt-3 pt-3 border-t border-gray-800">
              <Text className="text-green-500">Est. Distance: {distance}</Text>
              <Text className="text-green-500">Est. Time: {duration}</Text>
            </View>
          </View>

          <View className="flex-1">
            <Text className="text-lg font-semibold text-green-500 mb-2">
              Suggested Routes
            </Text>
            <ScrollView className="flex-1">
              {routeOptions.map((option, index) => (
                <TouchableOpacity
                  key={index}
                  className="bg-gray-900 border border-gray-800 p-3 mb-3 rounded-lg"
                  onPress={() => selectRouteOption(option)}
                >
                  <Text className="font-medium text-white">
                    {option.description}
                  </Text>
                  <View className="flex-row justify-between mt-1">
                    <Text className="text-green-600">{option.distance}</Text>
                    <Text className="text-green-600">{option.duration}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
          
          {/* Add Book Ticket Button */}
          <TouchableOpacity
            className="bg-green-600 py-4 rounded-xl my-3 shadow-lg"
            onPress={handleBookTicket}
          >
            <Text className="text-white font-bold text-center text-base">
              Book Ticket - ₹{paymentAmount}
            </Text>
          </TouchableOpacity>
        </View>

        {searchModalVisible && modalContent}
        {paymentModalVisible && paymentModalContent}
      </View>
    );
  }

  // Default view (when no route is confirmed)
  return (
    <View className="flex-1 bg-black">
      {mapSection}
      {locateButton}

      <View className="w-full h-1/2 bg-black p-4">
        <View className="w-full mb-4">
          <TouchableOpacity
            className="flex-row items-center bg-gray-900 border border-gray-800 px-3 py-2 rounded-lg"
            onPress={openSearchModal}
          >
            <Ionicons name="search" size={20} color="#22c55e" />
            <Text className="ml-2 flex-1 text-gray-400">
              Search destinations...
            </Text>
          </TouchableOpacity>
        </View>

        <View className="flex-1">
          <Text className="text-lg font-semibold text-green-500 mb-2">
            Previous Travels
          </Text>
          <ScrollView className="flex-1">
            {[1, 2, 3, 4, 5].map((item) => (
              <View
                key={item}
                className="bg-gray-900 border border-gray-800 p-3 mb-3 rounded-lg"
              >
                <Text className="font-medium text-white">Travel #{item}</Text>
                <Text className="text-gray-300">
                  Destination location • Date
                </Text>
                <View className="flex-row justify-between mt-1">
                  <Text className="text-green-600">5.2km</Text>
                  <Text className="text-green-600">30 mins</Text>
                </View>
              </View>
            ))}
          </ScrollView>
        </View>
      </View>

      {searchModalVisible && modalContent}
    </View>
  );
};

export default Bus;

const styles = StyleSheet.create({});
