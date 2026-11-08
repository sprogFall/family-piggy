import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';
import { MemoPanel } from './MemoPanel';

const mockCreate = jest.fn().mockResolvedValue(undefined);
jest.mock('@/stores/memo.store', () => ({
  useMemoStore: (selector: (state: unknown) => unknown) => selector({ byScope: {}, load: jest.fn().mockResolvedValue(undefined), subscribe: jest.fn(() => jest.fn()), create: mockCreate, update: jest.fn(), remove: jest.fn(), reorder: jest.fn() }),
  selectMemoItems: () => [],
}));
jest.mock('@/stores/ledger.store', () => ({ useLedgerStore: (selector: (state: unknown) => unknown) => selector({ families: [{ family: { id: 'f', name: '家' } }] }) }));

test('个人和家庭共用表单并传递独立范围', async () => {
  render(<MemoPanel />);
  fireEvent.press(screen.getByLabelText('选择家庭家'));
  fireEvent.press(screen.getByLabelText('添加备忘录'));
  fireEvent.changeText(screen.getByLabelText('备忘录内容'), '买菜');
  fireEvent.press(screen.getByLabelText('重要程度重要'));
  fireEvent.press(screen.getByText('保存'));
  await waitFor(() => expect(screen.queryByLabelText('备忘录内容')).toBeNull());
  expect(mockCreate).toHaveBeenCalledWith({ type: 'family', familyId: 'f' }, { content: '买菜', importance: 'high' });
});
