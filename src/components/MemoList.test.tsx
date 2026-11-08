import { fireEvent, render, screen } from '@testing-library/react-native';
import { getDialogRequest, dismissDialog } from '@/lib/alert';
import { MemoList } from './MemoList';

jest.mock('react-native/Libraries/Interaction/PanResponder', () => ({
  __esModule: true,
  default: { create: (handlers: Record<string, unknown>) => ({ panHandlers: {
    onResponderMove: handlers.onPanResponderMove,
    onResponderRelease: handlers.onPanResponderRelease,
  } }) },
}));

const item = { id: '1', scope: { type: 'personal' as const }, ownerId: 'u', content: '买菜', importance: 'high' as const, isCompleted: false, sortOrder: null, createdAt: '', updatedAt: '' };

afterEach(dismissDialog);

test('右滑切换完成无需确认，删除必须确认', () => {
  const onToggle = jest.fn();
  const onDelete = jest.fn();
  render(<MemoList items={[item]} onEdit={jest.fn()} onToggle={onToggle} onDelete={onDelete} onReorder={jest.fn()} />);
  fireEvent.press(screen.getByLabelText('完成买菜'));
  expect(onToggle).toHaveBeenCalledWith(item, true);
  expect(getDialogRequest()).toBeNull();
  fireEvent.press(screen.getByLabelText('删除买菜'));
  expect(onDelete).not.toHaveBeenCalled();
  getDialogRequest()?.buttons.find((button) => button.style === 'destructive')?.onPress?.();
  expect(onDelete).toHaveBeenCalledWith(item);
});

test('滑动和长按拖拽触发预期操作', () => {
  const onToggle = jest.fn();
  const onReorder = jest.fn();
  const second = { ...item, id: '2', content: '做饭', importance: 'low' as const };
  render(<MemoList items={[item, second]} onEdit={jest.fn()} onToggle={onToggle} onDelete={jest.fn()} onReorder={onReorder} />);
  const row = screen.getByTestId('memo-row-1');
  fireEvent(row, 'responderRelease', {}, { dx: 80, dy: 0 });
  expect(onToggle).toHaveBeenCalledWith(item, true);
  fireEvent(row, 'responderRelease', {}, { dx: -80, dy: 0 });
  expect(getDialogRequest()?.title).toBe('删除备忘录');
  fireEvent(screen.getByLabelText('编辑买菜'), 'longPress');
  fireEvent(row, 'responderMove', {}, { dx: 0, dy: 70 });
  fireEvent(row, 'responderRelease', {}, { dx: 0, dy: 70 });
  expect(onReorder).toHaveBeenCalledWith([second, item]);
});

test('点击内容编辑，显示重要程度', () => {
  const onEdit = jest.fn();
  render(<MemoList items={[item]} onEdit={onEdit} onToggle={jest.fn()} onDelete={jest.fn()} onReorder={jest.fn()} />);
  fireEvent.press(screen.getByLabelText('编辑买菜'));
  expect(onEdit).toHaveBeenCalledWith(item);
  expect(screen.getByText('重要')).toBeTruthy();
});
