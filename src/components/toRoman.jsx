// Función para convertir a números romanos
const toRoman = (num) => {
  const romanNumerals = [
    "", "I", "II", "III", "IV", "V", "VI", "VII", "VIII", "IX", "X",
    "XI", "XII", "XIII", "XIV", "XV", "XVI", "XVII", "XVIII", "XIX", "XX"
  ];
  return romanNumerals[num] || num;
};
export default toRoman;