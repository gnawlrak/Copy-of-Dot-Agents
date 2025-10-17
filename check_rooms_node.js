const fs = require('fs');

// 模拟浏览器环境中的localStorage
const localStorage = {
  data: {},
  
  getItem(key) {
    // 读取实际的localStorage文件
    try {
      const data = fs.readFileSync('localStorage.json', 'utf8');
      this.data = JSON.parse(data);
    } catch (e) {
      this.data = {};
    }
    
    return this.data[key] || null;
  },
  
  setItem(key, value) {
    this.data[key] = value;
    this.save();
  },
  
  removeItem(key) {
    delete this.data[key];
    this.save();
  },
  
  save() {
    try {
      fs.writeFileSync('localStorage.json', JSON.stringify(this.data, null, 2));
    } catch (e) {
      console.error('Error saving localStorage:', e);
    }
  }
};

// 检查房间数据
const ROOMS_KEY = 'dot_agents_mock_rooms_v2';

console.log('Checking localStorage for room data...\n');

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