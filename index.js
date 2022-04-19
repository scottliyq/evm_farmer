
const schedule = require('node-schedule');
const farm_yeti = require('./farm_yeti.js');



async function main(){

    schedule.scheduleJob('1 50 * * * *',()=>{
        try {
            console.log('Task star: ' + new Date());
            farm_yeti.processFarm()
        } catch( error  ) {

            if(error.message !== undefined)
                console.error(error.message);
            else
                console.error( error );
        }
    }); 
}

main();