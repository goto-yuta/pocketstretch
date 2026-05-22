import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import EditScene from '../../src/screens/EditScene';

const mockGoBack = jest.fn();
jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ goBack: mockGoBack }),
}));
jest.mock('../../src/store/useUserStore', () => ({
  useUserStore: (sel: any) => sel({ setScene: jest.fn() }),
}));

test('シーン選択後に goBack が呼ばれる', () => {
  const { getByText } = render(<EditScene />);
  fireEvent.press(getByText('オフィス向け'));
  expect(mockGoBack).toHaveBeenCalled();
});
