export default function MeasurementInput({
  onChange,
  type,
  value,
  labelValue,
}) {
  return (
    <div className="field field--compact">
      <input
        type={type}
        onChange={onChange}
        value={value}
        placeholder=" "
        id={labelValue}
        min="0"
        step="0.01"
      />

      <label htmlFor={labelValue}>{labelValue}</label>
    </div>
  );
}