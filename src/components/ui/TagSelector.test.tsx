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

  it('新增标签：输入后确认回调 onCreate，并收起输入框', () => {
    const props = setup({ tags: [] });
    fireEvent.press(screen.getByText('新标签'));

    const input = screen.getByPlaceholderText('标签名');
    fireEvent.changeText(input, '  下午茶  ');
    fireEvent.press(screen.getByLabelText('确认新增标签'));

    expect(props.onCreate).toHaveBeenCalledWith('下午茶');
    expect(screen.queryByPlaceholderText('标签名')).toBeNull();
  });

  it('空输入不触发新增', () => {
    const props = setup({ tags: [] });
    fireEvent.press(screen.getByText('新标签'));
    fireEvent.changeText(screen.getByPlaceholderText('标签名'), '   ');
    fireEvent.press(screen.getByLabelText('确认新增标签'));
    expect(props.onCreate).not.toHaveBeenCalled();
  });

  it('长按标签回调删除（由调用方二次确认）', () => {
    const props = setup();
    fireEvent(screen.getByText('夜宵'), 'longPress');
    expect(props.onRemove).toHaveBeenCalledWith(tag('g2', '夜宵'));
  });
});
