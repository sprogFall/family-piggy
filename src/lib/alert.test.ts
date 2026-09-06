import { Alert, Platform } from 'react-native';

import { showAlert } from './alert';

const replacePlatform = (os: typeof Platform.OS) => jest.replaceProperty(Platform, 'OS', os);

describe('showAlert', () => {
  let alertSpy: jest.SpyInstance;

  beforeEach(() => {
    alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => undefined);
  });

  afterEach(() => {
    alertSpy.mockRestore();
    delete (globalThis as { window?: unknown }).window;
  });

  it('native 平台委托 Alert.alert', () => {
    replacePlatform('ios');
    const onOk = jest.fn();
    const buttons = [{ text: '好的', onPress: onOk }];

    showAlert('标题', '内容', buttons);

    expect(alertSpy).toHaveBeenCalledWith('标题', '内容', buttons);
    expect(onOk).not.toHaveBeenCalled();
  });

  it('web 平台无取消按钮时用 window.alert 并触发回调', () => {
    replacePlatform('web');
    const alertSpy = jest.fn();
    (globalThis as { window: unknown }).window = { alert: alertSpy, confirm: jest.fn() };
    const onOk = jest.fn();

    showAlert('标题', '内容', [{ text: '好的', onPress: onOk }]);

    expect(alertSpy).toHaveBeenCalledWith('标题\n内容');
    expect(onOk).toHaveBeenCalled();
  });

  it('web 平台有取消按钮时用 window.confirm 分发回调', () => {
    replacePlatform('web');
    const confirmSpy = jest.fn(() => true);
    (globalThis as { window: unknown }).window = { alert: jest.fn(), confirm: confirmSpy };
    const onOk = jest.fn();
    const onCancel = jest.fn();

    showAlert('删除', '确定吗？', [
      { text: '取消', style: 'cancel', onPress: onCancel },
      { text: '删除', style: 'destructive', onPress: onOk },
    ]);

    expect(confirmSpy).toHaveBeenCalledWith('删除\n确定吗？');
    expect(onOk).toHaveBeenCalled();
    expect(onCancel).not.toHaveBeenCalled();
  });
});
