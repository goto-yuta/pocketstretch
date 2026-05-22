import React from 'react';
import { render, fireEvent } from '@testing-library/react-native';
import PrimaryButton from '../../src/components/PrimaryButton';

test('ラベルを表示する', () => {
  const { getByText } = render(<PrimaryButton label="テスト" onPress={() => {}} />);
  expect(getByText('テスト')).toBeTruthy();
});

test('disabled のとき onPress が呼ばれない', () => {
  const onPress = jest.fn();
  const { getByText } = render(<PrimaryButton label="テスト" onPress={onPress} disabled />);
  fireEvent.press(getByText('テスト'));
  expect(onPress).not.toHaveBeenCalled();
});
