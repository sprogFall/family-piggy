import * as ImagePicker from 'expo-image-picker';
import { fireEvent, render, screen, waitFor } from '@testing-library/react-native';

import { TransactionExtrasFields } from './TransactionExtrasFields';

const launchImageLibraryAsyncMock = ImagePicker.launchImageLibraryAsync as unknown as jest.Mock;

describe('TransactionExtrasFields', () => {
  beforeEach(() => {
    launchImageLibraryAsyncMock.mockReset();
    launchImageLibraryAsyncMock.mockResolvedValue({ canceled: true, assets: [] });
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

    fireEvent(screen.getByLabelText('是否报销'), 'valueChange', true);
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
