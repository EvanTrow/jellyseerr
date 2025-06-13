import Modal from '@app/components/Common/Modal';
import Tooltip from '@app/components/Common/Tooltip';
import CopyButton from '@app/components/Settings/CopyButton';
import defineMessages from '@app/utils/defineMessages';
import { Transition } from '@headlessui/react';
import { ArrowDownIcon } from '@heroicons/react/24/solid';
import { useFormikContext } from 'formik';
import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';
import { useIntl } from 'react-intl';
import type { ClearIndicatorProps, GroupBase, MultiValue } from 'react-select';
import { components } from 'react-select';
import CreatableSelect from 'react-select/creatable';

const messages = defineMessages('components.Settings', {
  copyFilteredKeywords: 'Copied blacklisted keywords to clipboard.',
  copyFilteredKeywordsTip: 'Copy blacklisted keyword configuration',
  copyFilteredKeywordsEmpty: 'Nothing to copy',
  importFilteredKeywordsTip: 'Import keyword configuration',
  clearFilteredKeywordsConfirm: 'Are you sure you want to clear the keywords?',
  yes: 'Yes',
  no: 'No',
  searchKeywords: 'Type or paste keywords…',
  starttyping: 'Start typing to add keywords.',
  nooptions: 'No results.',
  blacklistedKeywordImportTitle: 'Import Keyword Configuration',
  blacklistedKeywordImportInstructions:
    'Paste keyword configuration below (comma separated).',
  valueRequired: 'You must provide a value.',
});

type SingleVal = {
  label: string;
  value: string;
};

type FilteredKeywordselectorProps = {
  defaultValue?: string;
};

const FilteredKeywordselector = ({
  defaultValue,
}: FilteredKeywordselectorProps) => {
  const { setFieldValue } = useFormikContext();
  const [value, setValue] = useState<string | undefined>(defaultValue);
  const intl = useIntl();
  const [selectorValue, setSelectorValue] =
    useState<MultiValue<SingleVal> | null>(
      defaultValue
        ? defaultValue.split(',').map((kw) => ({ label: kw, value: kw }))
        : null
    );

  const update = useCallback(
    (value: MultiValue<SingleVal> | null) => {
      const strVal = value?.map((v) => v.value).join(',');
      setSelectorValue(value);
      setValue(strVal);
      setFieldValue('filteredKeywords', strVal);
    },
    [setSelectorValue, setValue, setFieldValue]
  );

  const copyDisabled = value === null || value?.length === 0;

  return (
    <>
      <ControlledKeywordSelector
        value={selectorValue}
        onChange={update}
        defaultValue={defaultValue}
        components={{
          DropdownIndicator: undefined,
          IndicatorSeparator: undefined,
          ClearIndicator: VerifyClearIndicator,
        }}
      />

      <CopyButton
        textToCopy={value ?? ''}
        disabled={copyDisabled}
        toastMessage={intl.formatMessage(messages.copyFilteredKeywords)}
        tooltipContent={intl.formatMessage(
          copyDisabled
            ? messages.copyFilteredKeywordsEmpty
            : messages.copyFilteredKeywordsTip
        )}
        tooltipConfig={{ followCursor: false }}
      />
      <FilteredKeywordsImportButton setSelector={update} />
    </>
  );
};

type BaseSelectorMultiProps = {
  defaultValue?: string;
  value: MultiValue<SingleVal> | null;
  onChange: (value: MultiValue<SingleVal> | null) => void;
  components?: Partial<typeof components>;
};

const ControlledKeywordSelector = ({
  defaultValue,
  onChange,
  components,
  value,
}: BaseSelectorMultiProps) => {
  const intl = useIntl();

  // No API, just allow free entry
  return (
    <CreatableSelect
      key={`keyword-select-filteredKeywords`}
      inputId="data"
      isMulti
      className="react-select-container"
      classNamePrefix="react-select"
      noOptionsMessage={({ inputValue }) =>
        inputValue === ''
          ? intl.formatMessage(messages.starttyping)
          : intl.formatMessage(messages.nooptions)
      }
      value={value}
      placeholder={intl.formatMessage(messages.searchKeywords)}
      onChange={onChange}
      components={components}
      formatCreateLabel={(inputValue) => `Add "${inputValue}"`}
    />
  );
};

type FilteredKeywordsImportButtonProps = {
  setSelector: (value: MultiValue<SingleVal>) => void;
};

const FilteredKeywordsImportButton = ({
  setSelector,
}: FilteredKeywordsImportButtonProps) => {
  const [show, setShow] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const intl = useIntl();

  const onConfirm = useCallback(async () => {
    if (formRef.current) {
      if (await formRef.current.submitForm()) {
        setShow(false);
      }
    }
  }, []);

  const onClick = useCallback((event: React.MouseEvent) => {
    event.stopPropagation();
    setShow(true);
  }, []);

  return (
    <>
      <Transition
        as="div"
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        show={show}
      >
        <Modal
          title={intl.formatMessage(messages.blacklistedKeywordImportTitle)}
          okText="Confirm"
          onOk={onConfirm}
          onCancel={() => setShow(false)}
        >
          <BlacklistedKeywordImportForm
            ref={formRef}
            setSelector={setSelector}
          />
        </Modal>
      </Transition>

      <Tooltip
        content={intl.formatMessage(messages.importFilteredKeywordsTip)}
        tooltipConfig={{ followCursor: false }}
      >
        <button className="input-action" onClick={onClick} type="button">
          <ArrowDownIcon />
        </button>
      </Tooltip>
    </>
  );
};

type BlacklistedKeywordImportFormProps = FilteredKeywordsImportButtonProps;

const BlacklistedKeywordImportForm = forwardRef<
  Partial<HTMLFormElement>,
  BlacklistedKeywordImportFormProps
>((props, ref) => {
  const { setSelector } = props;
  const intl = useIntl();
  const [formValue, setFormValue] = useState('');
  const [errors, setErrors] = useState<string[]>([]);

  useImperativeHandle(ref, () => ({
    submitForm: handleSubmit,
    formValue,
  }));

  const validate = async () => {
    if (formValue.length === 0) {
      setErrors([intl.formatMessage(messages.valueRequired)]);
      return false;
    }

    // Accept comma separated, trim whitespace
    const keywords = formValue
      .split(',')
      .map((kw) => kw.trim())
      .filter((kw) => kw.length > 0);

    if (keywords.length === 0) {
      setErrors([intl.formatMessage(messages.valueRequired)]);
      return false;
    }

    setSelector(keywords.map((kw) => ({ label: kw, value: kw })));
    setErrors([]);
    return true;
  };

  const handleSubmit = validate;

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label htmlFor="value">
          {intl.formatMessage(messages.blacklistedKeywordImportInstructions)}
        </label>
        <textarea
          id="value"
          value={formValue}
          onChange={(e) => setFormValue(e.target.value)}
          className="h-20"
        />
        {errors.length > 0 && (
          <div className="error">
            {errors.map((error) => (
              <div key={error}>{error}</div>
            ))}
          </div>
        )}
      </div>
    </form>
  );
});

const VerifyClearIndicator = <
  Option,
  IsMuti extends boolean,
  Group extends GroupBase<Option>
>(
  props: ClearIndicatorProps<Option, IsMuti, Group>
) => {
  const { clearValue } = props;
  const [show, setShow] = useState(false);
  const intl = useIntl();

  const openForm = useCallback(() => {
    setShow(true);
  }, [setShow]);

  const openFormKey = useCallback(
    (event: React.KeyboardEvent) => {
      if (show) return;

      if (event.key === 'Enter' || event.key === 'Space') {
        setShow(true);
      }
    },
    [setShow, show]
  );

  const acceptForm = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Enter') {
        event.stopPropagation();
        event.preventDefault();
        clearValue();
      }
    },
    [clearValue]
  );

  useEffect(() => {
    if (show) {
      window.addEventListener('keydown', acceptForm);
    }

    return () => window.removeEventListener('keydown', acceptForm);
  }, [show, acceptForm]);

  return (
    <>
      <button
        type="button"
        onClick={openForm}
        onKeyDown={openFormKey}
        className="react-select__indicator react-select__clear-indicator css-1xc3v61-indicatorContainer cursor-pointer"
      >
        <components.CrossIcon />
      </button>
      <Transition
        as="div"
        enter="transition-opacity duration-300"
        enterFrom="opacity-0"
        enterTo="opacity-100"
        leave="transition-opacity duration-300"
        leaveFrom="opacity-100"
        leaveTo="opacity-0"
        show={show}
      >
        <Modal
          subTitle={intl.formatMessage(messages.clearFilteredKeywordsConfirm)}
          okText={intl.formatMessage(messages.yes)}
          cancelText={intl.formatMessage(messages.no)}
          onOk={clearValue}
          onCancel={() => setShow(false)}
        >
          <form />{' '}
          {/* Form prevents accidentally saving settings when pressing enter */}
        </Modal>
      </Transition>
    </>
  );
};

export default FilteredKeywordselector;
