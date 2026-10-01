import * as ImagePicker from 'expo-image-picker';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TransactionExtrasFields } from './TransactionExtrasFields';

const launchImageLibraryAsyncMock = ImagePicker.launchImageLibraryAsync as unknown as jest.Mock;

describe('TransactionExtrasFields', () => {
  beforeEach(() => {
    launchImageLibraryAsyncMock.mockReset();
    launchImageLibraryAsyncMock.mockResolvedValue({ canceled: true, assets: [] });
  });

  it('记账类型使用边框勾选，且不展示冗余灰色注释', () => {
    const onReimbursementChange = jest.fn();
    render(
      <TransactionExtrasFields
        note=""
        onNoteChange={jest.fn()}
        reimbursement={false}
        onReimbursementChange={onReimbursementChange}
        images={[]}
        onImagesChange={jest.fn()}
      />,
    );

    expect(screen.queryByText('仅属于本笔，不会复用')).toBeNull();
    expect(screen.queryByText('后续可继续扩展')).toBeNull();
    expect(screen.getByLabelText('报销').props.accessibilityState).toEqual({ checked: false });

    fireEvent.press(screen.getByLabelText('报销'));
    expect(onReimbursementChange).toHaveBeenCalledWith(true);
  });

  it('定时记账类型可勾选并显示已选计划', () => {
    const onRecurringChange = jest.fn();
    const { rerender } = render(
      <TransactionExtrasFields
        note=""
        onNoteChange={jest.fn()}
        reimbursement={false}
        onReimbursementChange={jest.fn()}
        recurring={false}
        onRecurringChange={onRecurringChange}
        recurringScheduleLabel={null}
        images={[]}
        onImagesChange={jest.fn()}
      />,
    );

    expect(screen.getByLabelText('定时记账').props.accessibilityState).toEqual({ checked: false });
    fireEvent.press(screen.getByLabelText('定时记账'));
    expect(onRecurringChange).toHaveBeenCalledWith(true);

    rerender(
      <TransactionExtrasFields
        note=""
        onNoteChange={jest.fn()}
        reimbursement={false}
        onReimbursementChange={jest.fn()}
        recurring
        onRecurringChange={onRecurringChange}
        recurringScheduleLabel="每月10号"
        images={[]}
        onImagesChange={jest.fn()}
      />,
    );
    expect(screen.getByLabelText('定时记账').props.accessibilityState).toEqual({ checked: true });
    expect(screen.getByText('已设为 每月10号')).toBeTruthy();
  });

  it('备注与是否报销分别回调', () => {
    const onNoteChange = jest.fn();
    const onReimbursementChange = jest.fn();
    render(
      <TransactionExtrasFields
        note=""
        onNoteChange={onNoteChange}
        reimbursement={false}
        onReimbursementChange={onReimbursementChange}
        images={[]}
        onImagesChange={jest.fn()}
      />,
    );

    fireEvent.changeText(screen.getByLabelText('备注'), '本笔备注');
    expect(onNoteChange).toHaveBeenCalledWith('本笔备注');

    fireEvent.press(screen.getByLabelText('报销'));
    expect(onReimbursementChange).toHaveBeenCalledWith(true);
  });

  it('选择图片后追加草稿，达到 3 张后隐藏添加入口', async () => {
    const onImagesChange = jest.fn();
    launchImageLibraryAsyncMock.mockResolvedValue({
      canceled: false,
      assets: [{ uri: 'file:///a.jpg', mimeType: 'image/jpeg' }],
    });

    const { rerender } = render(
      <TransactionExtrasFields
        note=""
        onNoteChange={jest.fn()}
        reimbursement={false}
        onReimbursementChange={jest.fn()}
        images={[]}
        onImagesChange={onImagesChange}
      />,
    );

    fireEvent.press(screen.getByLabelText('添加图片'));
    await waitFor(() => expect(onImagesChange).toHaveBeenCalledTimes(1));
    const next = onImagesChange.mock.calls[0][0] as { uri: string }[];
    expect(next).toHaveLength(1);
    expect(next[0].uri).toBe('file:///a.jpg');

    rerender(
      <TransactionExtrasFields
        note=""
        onNoteChange={jest.fn()}
        reimbursement={false}
        onReimbursementChange={jest.fn()}
        images={[
          { id: '1', uri: 'a', remote: true },
          { id: '2', uri: 'b', remote: true },
          { id: '3', uri: 'c', remote: true },
        ]}
        onImagesChange={jest.fn()}
      />,
    );
    expect(screen.queryByLabelText('添加图片')).toBeNull();
  });

  it('点删除图片回调剩余图片', () => {
    const onImagesChange = jest.fn();
    render(
      <TransactionExtrasFields
        note=""
        onNoteChange={jest.fn()}
        reimbursement={false}
        onReimbursementChange={jest.fn()}
        images={[
          { id: '1', uri: 'a', remote: true },
          { id: '2', uri: 'b', remote: true },
        ]}
        onImagesChange={onImagesChange}
      />,
    );

    fireEvent.press(screen.getByLabelText('删除图片 1'));
    expect(onImagesChange).toHaveBeenCalledWith([{ id: '2', uri: 'b', remote: true }]);
  });
});
