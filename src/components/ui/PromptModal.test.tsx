import { fireEvent, render, screen } from '@testing-library/react-native';

import { PromptModal } from './PromptModal';

describe('PromptModal', () => {
  it('打开时展示 initialValue，提交 trim 后的值', () => {
    const onSubmit = jest.fn();
    const onClose = jest.fn();
    render(
      <PromptModal
        visible
        title="修改昵称"
        initialValue="小明"
        onClose={onClose}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.changeText(screen.getByDisplayValue('小明'), ' 小红 ');
    fireEvent.press(screen.getByText('确定'));

    expect(onSubmit).toHaveBeenCalledWith('小红');
    expect(onClose).toHaveBeenCalled();
  });
});
