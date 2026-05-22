import React from 'react';
import { render } from '@testing-library/react-native';
import OnboardingProgressBar from '../../src/components/OnboardingProgressBar';

test('1/4 のステップ番号を表示する', () => {
  const { getByText } = render(<OnboardingProgressBar current={1} total={4} />);
  expect(getByText('1 / 4')).toBeTruthy();
});

test('4/4 のステップ番号を表示する', () => {
  const { getByText } = render(<OnboardingProgressBar current={4} total={4} />);
  expect(getByText('4 / 4')).toBeTruthy();
});
