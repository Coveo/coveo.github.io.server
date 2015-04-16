var express = require('express');
var request = require('request');
var promise = require('promise');
var objectAssign = require('object-assign');
var url     = require('url');

var GITHUB_CLIENT_ID = '16982c71696edc09f645';
var GITHUB_CLIENT_SECRET  = 'aba7a64522ca3ab5f667ae9bb111837f0f8ded99';

// In-memory Stores
var GITHUB_USER = process.env['GITHUB_USER'] || 'coveo'

var _data = {};
var _needsUpdate = true;

/*var resetTimeout = (function(){
  var timeoutID;

  var timeoutfunc = function(){
    clearTimeout(timeoutID);
    _needsUpdate = true
    timeoutID = setTimeout(timeoutfunc, 5 * 60 * 100);
  };

  return timeoutfunc;
})();*/

function githubRequest(giturl){
  var _baseURL = {
    protocol: 'https',
    host:'api.github.com',
    query:{
      'client_id':GITHUB_CLIENT_ID,
      'client_secret':GITHUB_CLIENT_SECRET
    }
  }

  _baseURL.pathname = giturl.pathname
  objectAssign(_baseURL.query, giturl.query);

  return new Promise(function(fulfill,reject){
    request({
      url: url.format(_baseURL),
      headers:{
        'Accepts': 'application/vnd.github.v3+json',
        'User-Agent': GITHUB_USER
      }
    }, function (error, response, body) {
      if(!error && response.statusCode === 200){
        fulfill(JSON.parse(body));
        return;
      }
      reject(error || response);
    });
  });
}

function getRepositories(){
  return githubRequest({
    pathname: '/users/' + GITHUB_USER + '/repos',
    query:{type: 'public'}
  });
}


function getRepositoryPunchcard(repo){
  return githubRequest({
    pathname: '/repos/' + GITHUB_USER + '/' + repo+ '/stats/punch_card'
  })
}

function getRepositoryLanguages(repo){
  return githubRequest({
    pathname: '/repos/' + GITHUB_USER + '/' + repo+ '/languages'
  })
}

function updateData(){
  _needsUpdate = false;
  //resetTimeout();

  return getRepositories().then(function(repos){

    return Promise.all(repos.map(function(repo){
      return Promise.all([
        getRepositoryPunchcard(repo.name),
        getRepositoryLanguages(repo.name)
      ]).then(function(results){
        return objectAssign({}, repo, {
          punchcard: results[0],
          languages: results[1]
        });
      });
    }));

  });
}

function getData(){
  if(_needsUpdate){
    return updateData();
  }else{
    return Promise.resolve(_data);
  }
  // This function should update all data from github
  // max is 5000 request per hour with authentication
  // 60 without

  // Accept: application/vnd.github.v3+json
  // Authorization: application/vnd.github.v3+json

  // endpoint: https://api.github.com
}

var app = express();

app.get('/', function(req,res){
  res.send('Hello coveo folks!');
});

app.get('/repositories', function(req,res){
  res.type('json');
  getData().then(function(data){
    res.status(200).send(JSON.stringify(data));
  })
});

/*app.post('/githubhook', function(req,res){
  // a github org hook to tell the server when to update data
});*/

var server = app.listen(process.env['PORT'] || 3000, function(){
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
