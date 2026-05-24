import React from 'react';
import { render } from '@testing-library/react-native';
import Step1BodyParts from '../../src/screens/onboarding/Step1BodyParts';
import { DISCLAIMER_SHORT } from '../../src/data/disclaimer';

jest.mock('@react-navigation/native', () => ({
  useNavigation: () => ({ navigate: jest.fn() }),
}));
jest.mock('../../src/store/useUserStore', () => ({
  useUserStore: (sel: any) => sel({
    setBodyParts: jest.fn(),
    bodyParts: [],
  }),
}));

it('shows the medical disclaimer on Step1', () => {
  const navigation = { navigate: jest.fn() } as any;
  const { getByText } = render(<Step1BodyParts navigation={navigation} />);
  expect(getByText(DISCLAIMER_SHORT)).toBeTruthy();
});
