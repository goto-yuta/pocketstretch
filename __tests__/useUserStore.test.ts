import { act, renderHook } from '@testing-library/react-native';
import { useUserStore } from '../src/store/useUserStore';

describe('useUserStore', () => {
  beforeEach(() => {
    useUserStore.setState({
      onboardingCompleted: false,
      bodyParts: [],
      scene: 'office',
      notificationEnabled: false,
      notificationTimes: [],
    });
  });

  it('sets body parts', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setBodyParts(['neck', 'shoulder']));
    expect(result.current.bodyParts).toEqual(['neck', 'shoulder']);
  });

  it('sets scene', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setScene('serious'));
    expect(result.current.scene).toBe('serious');
  });

  it('completes onboarding', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.completeOnboarding());
    expect(result.current.onboardingCompleted).toBe(true);
  });

  it('sets notification times', () => {
    const { result } = renderHook(() => useUserStore());
    act(() => result.current.setNotificationTimes(['09:00', '14:00']));
    expect(result.current.notificationTimes).toEqual(['09:00', '14:00']);
  });
});
