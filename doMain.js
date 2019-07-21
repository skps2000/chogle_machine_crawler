// 링크를 분석해서 다운로드 (Node.js)

// --- 공통 설정 ---
var apps = {
    cl : console.log
    ,gTARGET_DOMAIN : "https://www.ygosu.com"
    ,gTARGET_PATH : "/community/real_article/?page="
    ,gPAGE_RANGE : {start : 8, end:8}
};

(function(){
    
    'use strict';
    
    // --- 모듈 로드 ---
    var client = require('cheerio-httpcli');
    var request = require('request');
    var URL = require('url');
    var fs = require('fs');
    var path = require('path');
    
    var logger = apps.cl;
    var gCurPage = apps.gPAGE_RANGE.start;
    
    var curLvl = 1;
    var crwlLvlObj = {};
    var collectedArr = [];
    var resultCsv = [];
    
    const createCsvWriter = require('csv-writer').createObjectCsvWriter;
    const csvWriter = createCsvWriter({
      path: 'out.'+new Date().getTime()+'.csv',
      header: [
        {id: 'author', title: 'author'},
        {id: 'title', title: 'title'},
        {id: 'contents', title: 'contents'},
      ]
    });
    
    // 메인 처리
    doMain();

    //   지정 URL을 최대 level 단계까지 다운로드
    function doMain() {
        if(gCurPage <= apps.gPAGE_RANGE.end){
            var url = apps.gTARGET_DOMAIN + apps.gTARGET_PATH + gCurPage;
            client.fetch(url, {}, function(err, $, res) {
                $('#contain > div.board_t > div.board_left > div.board_wrap > table.bd_list > tbody > tr').each(function(){
                    var rstHref = $(this).find('td.tit > a').attr('href').toString(); 
                    collectedArr.push(rstHref);
                });
                
                //Recursive
                gCurPage = gCurPage + 1;
                doMain();
            });
        }else{
            getConts(collectedArr);
        }
    }
    
    function getConts(collectedArr){
        var url = collectedArr.shift();
        
        client.fetch(url, {}, function(err, $, res) {
            
            if(!$) return;
            
            resultCsv.push({
                author : $('#contain_user_info > div.level').html()//author
                ,title : $('#contain_user_info > div.nickname > a').html()//title
//                ,contents : $('#contain > div.board_body > div.container').html()//contents
                ,contents : (function(){
                        //filtering contents
                        var $cnts = $('#contain > div.board_body > div.container');
                        
                        $cnts.find('img').each(function(){
                            var that = $(this);
                            var fileUrl = $(this).attr('src');
                            var requestOptions  = { method: "GET"
                                        ,uri: fileUrl
                                        ,headers: { "User-Agent": "Mozilla/5.0" }
                                        ,encoding: null
                                      };
                            
                            var _lastDot = fileUrl.lastIndexOf('.');
 
                            // 확장자 명만 추출한 후 소문자로 변경
                            var _fileExt = fileUrl.substring(_lastDot, fileUrl.length).toLowerCase();
                            
                            if(!(_fileExt === '.jpg' || _fileExt === '.jpeg' || _fileExt === '.gif')){
                                return;
                            }
                            
                            var fileNm = './images/' + 'img_' + new Date().getTime()+_fileExt;
                            
                            that.attr('src', fileNm);
//                            that.remove();
//                            that.html('<img src='+fileNm+'>');
                            
                            // 파일명을 지정한다. 
                            request(requestOptions).pipe(fs.createWriteStream(fileNm).on('end',function(){
                                
                            }));
                        });
                    
                    fs.appendFile('text2.html', $cnts.html(), (err) => {
                        if(err) throw err;
                    });

                    return $cnts.html(); //contents;
                    
                    })()
                 
            });
            
            //Recursive
            if(collectedArr.length > 0){
                getConts(collectedArr);
            }else{
                outCsv(resultCsv);
            }
        });
        
    }
    
    function outCsv(csvArr){
        logger(csvArr);
        
//        csvWriter
//          .writeRecords(csvArr)
//          .then(()=> console.log('The CSV file was written successfully'));
     
//        var writeFile = require('write-file');
//        writeFile('bar.html', csvArr, function (err) {
//        });

        
    }
    
})();

// 저장할 디렉토리 존재유무 확인
function checkSaveDir(fname) {
    // 디렉터리 부분만 검출
    var dir = path.dirname(fname);
    
    // 디렉토리를 재귀적으로 생성
    var dirlist = dir.split("/");
    var p = "";
    for (var i in dirlist) {
        p += dirlist[i] + "/";
        if (!fs.existsSync(p)) {
            fs.mkdirSync(p);
        }
    }
}
