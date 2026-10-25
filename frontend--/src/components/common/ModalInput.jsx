// The ghost "underline" under the fields was the placeholder text showing through
// behind the floating label. The placeholder is now a single space (like InputCard does).
export default function ModalInput({
  type,
  text,
  onChange,
  value,
}) {
  return (
    <div className="field">
      <input
        type={type}
        placeholder=" "
        onChange={onChange}
        value={value}
        id={text}
        autoComplete="off"
      />

      <label htmlFor={text}>{text}</label>
    </div>
  );
}