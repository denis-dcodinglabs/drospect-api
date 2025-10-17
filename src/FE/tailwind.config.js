/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        custom: ['Raleway', 'Montserrat', 'sans-serif'],
      },
      colors: {
        background: '#100B20',
        primary: '#170630',
        secondary: '#DED2FF',
        gradientOne: '#7000FF',
        gradientTwo: '#DD0077',
        gradientThree: '#FC620A',
        colorSidebar: '#C5C5CF',
        activeColorSidebar: '#529FF9',
        buttonColor: '#212237',
      },
      screens: {
        xs: '300px',
      },
    },
  },
  plugins: [],
};
