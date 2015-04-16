var express = require('express');
var request = require('request');
var cors = require('cors');
var objectAssign = require('object-assign');
var url = require('url');

var GITHUB_CLIENT_ID = process.env['GITHUB_CLIENT_ID'] || '16982c71696edc09f645';
var GITHUB_CLIENT_SECRET = process.env['GITHUB_CLIENT_ID'] || 'aba7a64522ca3ab5f667ae9bb111837f0f8ded99';
var GITHUB_USER = process.env['GITHUB_USER'] || 'coveo';

function githubRequest(giturl){
  var _baseURL = {
    protocol: 'https',
    host: 'api.github.com',
    query: {
      'client_id': GITHUB_CLIENT_ID,
      'client_secret': GITHUB_CLIENT_SECRET
    }
  };

  _baseURL.pathname = giturl.pathname;
  objectAssign(_baseURL.query, giturl.query);

  return new Promise(function(fulfill, reject){
    request({
      url: url.format(_baseURL),
      headers: {
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

function getRepositories(user){
  return githubRequest({
    pathname: '/users/' + user + '/repos',
    query: {type: 'public'}
  });
}


function getRepositoryPunchcard(user, repo){
  return githubRequest({
    pathname: '/repos/' + user + '/' + repo + '/stats/punch_card'
  });
}

function getRepositoryLanguages(user, repo){
  return githubRequest({
    pathname: '/repos/' + user + '/' + repo + '/languages'
  });
}

function updateData(){
  // _needsUpdate = false;
  // resetTimeout();

  return getRepositories(GITHUB_USER).then(function(repos){

    return Promise.all(repos.map(function(repo){
      return Promise.all([
        getRepositoryPunchcard(GITHUB_USER, repo.name),
        getRepositoryLanguages(GITHUB_USER, repo.name)
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
  return updateData();
}

var app = express();
app.use(cors());

app.get('/', function(req, res){
  res.send('Hello Coveo folks!');
});

app.get('/repositories', function(req, res){
  res.type('json');
  getData().then(function(data){
    res.status(200).send(JSON.stringify(data));
  });
});

var server = app.listen(process.env['PORT'] || 3000, function(){
  var host = server.address().address;
  var port = server.address().port;
  console.log('Example app listening at http://%s:%s', host, port);
});
