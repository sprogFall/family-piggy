import {
  dismissDialog,
  getDialogRequest,
  pressDialogButton,
  showAlert,
  subscribeDialog,
} from './alert';

describe('dialog bus', () => {
  afterEach(() => dismissDialog());

  it('showAlert 发布弹窗请求，无按钮时补「好的」', () => {
    const listener = jest.fn();
    const unsubscribe = subscribeDialog(listener);

    showAlert('标题', '内容');

    expect(listener).toHaveBeenCalledTimes(1);
    expect(getDialogRequest()).toEqual({
      title: '标题',
      message: '内容',
      buttons: [{ text: '好的' }],
    });
    unsubscribe();
  });

  it('带按钮时保留按钮并在点击后关闭、执行回调', () => {
    const onOk = jest.fn();
    showAlert('删除', '确定吗？', [
      { text: '取消', style: 'cancel' },
      { text: '删除', style: 'destructive', onPress: onOk },
    ]);

    const dialog = getDialogRequest();
    expect(dialog?.buttons).toHaveLength(2);

    pressDialogButton(dialog!.buttons[1]);
    expect(onOk).toHaveBeenCalledTimes(1);
    expect(getDialogRequest()).toBeNull();
  });

  it('dismissDialog 清空当前请求', () => {
    showAlert('提示');
    expect(getDialogRequest()).not.toBeNull();
    dismissDialog();
    expect(getDialogRequest()).toBeNull();
  });
});
