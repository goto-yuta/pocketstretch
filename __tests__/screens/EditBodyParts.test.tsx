import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EditBodyParts from '../../src/screens/EditBodyParts';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));
jest.mock('../../src/store/useUserStore', () => ({
  useUserStore: (sel: any) => sel({
    setBodyParts: jest.fn(),
    bodyParts: [],
  }),
}));

test('部位を選択して保存すると goBack が呼ばれる', () => {
  const { getByText } = render(<EditBodyParts />);
  fireEvent.press(getByText('肩'));
  fireEvent.press(getByText('保存'));
  expect(mockGoBack).toHaveBeenCalled();
});
