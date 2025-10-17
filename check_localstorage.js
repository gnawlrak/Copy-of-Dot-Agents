// check_localstorage.js
const ROOMS_KEY = 'dot_agents_mock_rooms_v2';

console.log('Checking localStorage for room data...');

try {
  const roomsData = localStorage.getItem(ROOMS_KEY);
  if (roomsData && roomsData !== 'null') {
    try {
      const rooms = JSON.parse(roomsData);
      console.log('Found rooms data:');
      console.log(JSON.stringify(rooms, null, 2));
    } catch (parseError) {
      console.log('Parse error:', parseError.message);
      console.log('Raw data:', roomsData);
    }
  } else {
    console.log('No room data found in localStorage');
  }
} catch (error) {
  console.log('Error accessing localStorage:', error.message);
}