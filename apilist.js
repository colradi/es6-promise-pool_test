var rp = require("request-promise");
var PromisePool = require('es6-promise-pool');


const votes_url = "https://apilist.tronscan1.org/api/vote";

/* configuration options for request-promise library */
var votes_options = {
    uri: votes_url,
    qs: {
        candidate: "TDGy2M9qWBepSHDEutWWxWd1JZfmAed3BP", // -> uri + '?access_token=xxxxx%20xxxxx'
		start: 0,
		limit: 40,
		sort: "-votes" 
    },
    headers: {
        'User-Agent': 'Request-Promise'
    },
    json: true // Automatically parses the JSON string in the response
};

var i = 0;
var numPages = 100000000; //Any high value to start with (> concurrency).. It will be overwritten when the first fulfilled promise arrives
var promiseProducer = function () {
    var retval = null;
    if(i <= numPages){
        votes_options.qs.start = i*40; // prepare paginations: 40, 80, 120, 160, ..
        console.log("DEBUG: Producing promise " + (i++) + " numPages: " + numPages);
        retval = rp(votes_options); //request paginated pages
    }
    return retval;
}

// PROMISE POOL
var concurrency = 2;
var pool = new PromisePool(promiseProducer, concurrency);
var pages = [];
var filter = null; //to be asigned by the module.exports functions before starting the pool

pool.addEventListener('fulfilled', function (event) { //{ target: thispool, data: { promise: X, result: X}}
    //console.log(event.data.result.total);
    numPages = Math.floor(event.data.result.total / 40); //Also 'result.page.totalVotes'
    var data = filter(event.data.result.data);
    Array.prototype.push.apply(pages, event.data.result.data); //Merge the two arrays
    //console.log('Fulfilled: ' + event.data.result);
})

pool.addEventListener('rejected', function (event) {
  var e = event.data.error
  console.log('Rejected : #######################' + event.data.error.message);
  //console.log({e});
})



/**
 * Downloads voters, applies filter and return them
 * @param address Used to conform the final download URL
 * @param filterVoters  A function that receives an array of voters, filters them at will and returns them 
 */
function getFilteredVoters(address, filterVoters){
  votes_options.qs.candidate = address;
  filter = filterVoters;
  // Start the pool.
  var poolPromise = pool.start();

  return poolPromise.then(function () {
      console.log('----------------------All promises fulfilled-----------------------');
      //console.log({pages});
      return pages;
    }
  );

}

var filteredVoters = getFilteredVoters("TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp", function(arr){  //filter out voters with less than 1000 votes
            arr.filter (x =>  x.votes > 1000);  //x is a voter according json from https://apilist.tronscan.org/api/vote?sort=-votes&limit=40&start=0&candidate=TGzz8gjYiYRqpfmDwnLxfgPuLVNmpCswVp
        }
  ).then(x => {  //console.log(JSON.stringify(filteredVoters)); 
               });



//module.exports.getFilteredVoters = getFilteredVoters;
