var express = require('express');
var app = express();
var http = require('http').Server(app);
var io = require('socket.io')(http);
var MongoClient = require('mongodb').MongoClient;
var url = "mongodb://localhost:27017";
var path = require('path');

var middleware = [
    express.static(path.join(__dirname,'public'))
];
app.use(middleware);


app.get('/',function(req,res){
    res.sendfile(path.join(__dirname,'/views','layout.html'));
});
 
io.on('connection',function(socket){
    socket.on('setUsername',function(data){
        MongoClient.connect(url,function(err,db){
            if(err) throw err ;
            var dbo = db.db("chat");
            var query = {username:data.username};
            dbo.collection('users').find(query).toArray(function(error,res){
                if(error) throw error ;
                if(res.length > 0) {
                    socket.emit('userExists',data.username + ' username is taken! Try some other username.');
                }else{
                    dbo.collection('messages').find().toArray(function(er,result){
                        if(er) throw er ;
                        var join_no = result.length ;
                        var doc = {username:data.username,password:data.password,join_no:join_no};
                        dbo.collection('users').insertOne(doc,function(e,r){
                            if(e) throw e;
                            socket.emit('userSet',{data:data,result:result,join_no:join_no});
                        });
                    });
                }
            });
        });
    });
    socket.on('authenticate',function(data){
        MongoClient.connect(url,function(err,db){
            if(err) throw err ;
            var dbo = db.db("chat");
            var password = data.password;
            var query = {username:data.username};
            dbo.collection('users').find(query).toArray(function(error,res){
                if(error) throw error;
                if(res.length > 0) {
                    if(res[0].password == password) {
                        dbo.collection('messages').find().toArray(function(er,result){
                            if(er) throw er ;
                            socket.emit('userSet',{data:data,result:result,join_no:res[0].join_no});
                        });
                    }else {
                        socket.emit('notAuthenticated','Password not matched!!');
                    }
                }else{
                    socket.emit('notAuthenticated','Please Register first!!');
                }
            });
        });
    });
    socket.on('msg',function(data){
        MongoClient.connect(url,function(err,db){
            if(err) throw err ;
            var dbo = db.db("chat");
            var d = Date();
            dt = d.slice(0,24);
            var doc = {msg:data.message,user:data.user,time:dt};
            dbo.collection('messages').insertOne(doc,function(error,res){
                if(error) throw error ;
                io.sockets.emit('newmsg',data);
            });
        });
    });
});

http.listen(3000,function(){
    console.log('listening at *:3000');
});