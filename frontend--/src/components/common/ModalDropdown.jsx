import Dropdown from './dropdown';

// Same props as before, so AddOrderModal does not need to change:
// items = [{ id, first_name, last_name }], onChange receives an event-like { target: { value } }
export default function ModalDropdown({
  items,
  onChange,
  value,
  placeholder,
}) {
  const options = items.map((item) => ({
    value: item.id,
    label: `${item.first_name} ${item.last_name}`,
  }));

  return (
    <Dropdown
      label={placeholder}
      options={options}
      value={value}
      onChange={(v) => onChange({ target: { value: v } })}
    />
  );
}