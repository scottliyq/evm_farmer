const schedule = require('node-schedule');

// const  scheduleCronstyle = ()=>{
//   //每分钟的第30秒定时执行一次:
//     schedule.scheduleJob('1 12 * * * *',()=>{
//         console.log('scheduleCronstyle:' + new Date());
//     }); 
// }

// scheduleCronstyle();


const  test = ()=>{
  const str1 = "2.023";
  const str2 = "3.023";

  result = parseFloat(str1) * parseFloat(str2);

  console.log(result);

}

test();