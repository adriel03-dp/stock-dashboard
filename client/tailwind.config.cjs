const forest = {50:'#f0f3e9',100:'#e4ebd9',200:'#cedbbc',300:'#abc594',400:'#81a66b',500:'#557e43',600:'#365e35',700:'#2a4b31',800:'#263e2c',900:'#203427',950:'#14251a'};
const stone = {50:'#f8f7f2',100:'#efefe6',200:'#dedfd5',300:'#c4c8bb',400:'#939d8c',500:'#6f7969',600:'#576350',700:'#424f3d',800:'#29372b',900:'#202d23',950:'#152019'};
module.exports = {
  content:['./index.html','./src/**/*.{js,jsx}'],darkMode:'class',
  theme:{extend:{colors:{slate:stone,blue:forest,violet:forest,indigo:forest,cyan:forest,white:'#fdfcf8'},fontFamily:{sans:['DM Sans','sans-serif'],display:['DM Serif Display','Georgia','serif']}}},plugins:[]
};
