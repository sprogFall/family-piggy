import { fireEvent, render, screen } from '@testing-library/react-native';

import type { Tag } from '@/types/domain';

import { TagSelector } from './TagSelector';

const tag = (id: string, name: string): Tag => ({
  id,
  ledgerId: 'l1',
  kind: 'expense',
  name,
  createdAt: '2024-01-01T00:00:00Z',
});

const setup = (overrides: Partial<React.ComponentProps<typeof TagSelector>> = {}) => {
  const props = {
    tags: [tag('g1', '午饭'), tag('g2', '夜宵')],
    selectedId: null,
    onSelect: jest.fn(),
    onCreate: jest.fn(),
    onRemove: jest.fn(),
    ...overrides,
  };
  render(<TagSelector {...props} />);
  return props;
};

/** 打开「新标签」弹窗：输入框在 Modal 内，不会挤压/重排标签行 */
const openCreator = () => {
  fireEvent.press(screen.getByText('新标签'));
  return screen.getByPlaceholderText('标签名（最多 8 个字）');
};

describe('TagSelector', () => {
  it('展示同类型下已有标签供复用', () => {
    setup();
    expect(screen.getByText('午饭')).toBeTruthy();
    expect(screen.getByText('夜宵')).toBeTruthy();
  });

  it('点击标签回调选中，再次点击取消选中', () => {
    const props = setup();
    fireEvent.press(screen.getByText('午饭'));
    expect(props.onSelect).toHaveBeenCalledWith('g1');

    const selected = setup({ selectedId: 'g1' });
    fireEvent.press(screen.getByText('#午饭'));
    expect(selected.onSelect).toHaveBeenCalledWith(null);
  });

  it('未打开时没有输入框（输入框只在弹窗里）', () => {
    setup();
    expect(screen.queryByPlaceholderText('标签名（最多 8 个字）')).toBeNull();
  });

  it('点击「新标签」弹出输入弹窗', () => {
    setup();
    expect(openCreator()).toBeTruthy();
    expect(screen.getByText('新建标签')).toBeTruthy();
    expect(screen.getByText('添加')).toBeTruthy();
  });

  it('弹窗内输入名称并提交：回调 onCreate 且弹窗关闭', () => {
    const props = setup();
    fireEvent.changeText(openCreator(), '  下午茶  ');

    fireEvent.press(screen.getByText('添加'));

    expect(props.onCreate).toHaveBeenCalledWith('下午茶');
    expect(screen.queryByPlaceholderText('标签名（最多 8 个字）')).toBeNull();
  });

  it('弹窗内空输入不触发新增', () => {
    const props = setup();
    fireEvent.changeText(openCreator(), '   ');
    fireEvent.press(screen.getByText('添加'));
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  it('取消后不新增，且弹窗关闭', () => {
    const props = setup();
    openCreator();
    fireEvent.press(screen.getByText('取消'));
    expect(props.onCreate).not.toHaveBeenCalled();
    expect(screen.queryByPlaceholderText('标签名（最多 8 个字）')).toBeNull();
  });

  it('长按标签回调删除（由调用方二次确认）', () => {
    const props = setup();
    fireEvent(screen.getByText('夜宵'), 'longPress');
    expect(props.onRemove).toHaveBeenCalledWith(tag('g2', '夜宵'));
  });
});
