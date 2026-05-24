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

it('exposes an accessible button with its label', () => {
  const { getByLabelText } = render(<PrimaryButton label="今すぐストレッチする" onPress={() => {}} />);
  const node = getByLabelText('今すぐストレッチする');
  expect(node).toBeTruthy();
  expect(node.props.accessibilityRole).toBe('button');
});
