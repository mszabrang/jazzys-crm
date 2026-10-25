export default function InputCard({
  type,
  onChange,
  labelValue,
  value,
  placeholder,
}) {
  return (
    <div className="field">
      <input
        type={type}
        onChange={onChange}
        value={value}
        placeholder={placeholder || ' '}
        id={labelValue}
        autoComplete="off"
      />

      <label htmlFor={labelValue}>{labelValue}</label>
    </div>
  );
}