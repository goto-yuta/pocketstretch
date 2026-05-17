const mockStorage = {};

const AsyncStorage = {
  getItem: jest.fn((key) => {
    const value = mockStorage[key] ?? null;
    return value;
  }),
  setItem: jest.fn((key, value) => {
    mockStorage[key] = value;
  }),
  removeItem: jest.fn((key) => {
    delete mockStorage[key];
  }),
  clear: jest.fn(() => {
    Object.keys(mockStorage).forEach((key) => delete mockStorage[key]);
  }),
  getAllKeys: jest.fn(() => Object.keys(mockStorage)),
  multiGet: jest.fn((keys) =>
    keys.map((key) => [key, mockStorage[key] ?? null])
  ),
  multiSet: jest.fn((pairs) => {
    pairs.forEach(([key, value]) => {
      mockStorage[key] = value;
    });
  }),
  multiRemove: jest.fn((keys) => {
    keys.forEach((key) => delete mockStorage[key]);
  }),
};

module.exports = AsyncStorage;
