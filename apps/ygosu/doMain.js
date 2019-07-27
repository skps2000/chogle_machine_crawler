/**
 * Author : sk
 * date : 20190727
 * ver : 0.3
 * description : for crawlling ygosu contents
 */

// 링크를 분석해서 다운로드 (Node.js / ygosu)
// --- 공통 설정 ---
var apps = {
    cl : console.log
    ,gTARGET_DOMAIN : "https://www.ygosu.com"
    ,gTARGET_PATH : "/community/real_article/?page="
    ,gPAGE_RANGE : {start : 2, end : 2}
    ,dateObj : new Date()
    ,rtPath : 'C:/Users/sk/Documents/GitHub/chogle_machine_crawler'

};

(function(){
    
    'use strict';
    
    // --- 모듈 로드 ---
    var client = require('cheerio-httpcli');
    var request = require('request');
    var URL = require('url');
    var fs = require('fs');
    var path = require('path');
    var _ = require('underscore');

    var Promise = require('promise');
    
    var logger = function(log){
        return '[info] : '+apps.cl(log);
    }
    var gCurPage = apps.gPAGE_RANGE.start;
    
    var curLvl = 1;
    var crwlLvlObj = {};
    var collectedArr = [];
    var resultCsv = [];
    var downloadImgList = [];

    const createCsvWriter = require('csv-writer').createObjectCsvWriter;

    const csvWriter = createCsvWriter({
      path: 'out.' + new Date().getTime()+'.csv',
      header: [
        {id: 'author', title: 'author'},
        {id: 'title', title: 'title'},
        {id: 'contents', title: 'contents'},
      ]
    });
    
    // INIT
    (function(){
        

        doMain();
    })();

    function doMain() {
        if(gCurPage <= apps.gPAGE_RANGE.end){
            var url = apps.gTARGET_DOMAIN + apps.gTARGET_PATH + gCurPage;

            //본문 수집
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
                // ,contents : $('#contain > div.board_body > div.container').html()
                ,contents : (function(){
                                //filtering contents
                                var $cnts = $('#contain > div.board_body > div.container');
                                
                                $cnts.find('img').each(function(){
                                    var that = $(this);
                                    var fileUrl = $(this).attr('src');
                                    var _lastDot = fileUrl.lastIndexOf('.');
                                    // 확장자 명만 추출한 후 소문자로 변경
                                    var _fileExt = fileUrl.substring(_lastDot, fileUrl.length).toLowerCase();
                                    var fileNm = (function(){
                                        if(!(_fileExt === '.jpg' || _fileExt === '.jpeg' || _fileExt === '.gif' || _fileExt === '.png' )){
                                            return;
                                        }
                                        return '/apps/ygosu/images/' + 'img_' + new Date().getTime()+_fileExt;
                                    })();
                                    
                                    //본문의 src 경로 변경
                                    that.attr('src', fileNm);
                                    downloadImgList.push({fileNm:fileNm, fileUrl:fileUrl});
                                    
                                });

                            fs.appendFile(
                                apps.rtPath 
                                + '/apps/ygosu/CSV/CR_' 
                                + apps.dateObj.getTime() 
                                + '.csv', ( $('#contain_user_info > div.level').html()+',' + $('#contain_user_info > div.nickname > a').html()+',' + $cnts.html()), (err) => {
                                    if(err) logger(err);
                                });

                            //html file 작성
                            // fs.appendFile('text2.html', $cnts.html(), (err) => {
                            //     if(err) throw err;
                            // });
                            
                            return $cnts.html(); //contents;
                            
                            })()

            });
            
            //Recursive
            if(collectedArr.length > 0){
                getConts(collectedArr);
            }else{
                //END THE CRAWL
                downloadImgs(downloadImgList)
            }
        });
    }
    
    //3. MAKE CSV
    function outCsv(resultCsv){
        _.each(resultCsv, (obj, index) => {
            fs.appendFile(apps.rtPath + '/apps/ygosu/CSV/CR_' + apps.dateObj.getTime() + '.csv', ( obj.author+',' + obj.title+',' + obj.contents ), (err) => {
                if(err) logger(err);
            });
        })
    }

    function downloadImgs(downloadImgList){
        var imgInf = downloadImgList.shift();
        if(imgInf){
            logger(imgInf, apps.rtPath + imgInf.fileNm);
            // Download Image
            request({ method: "GET"
                ,uri: imgInf.fileUrl
                ,headers: { "User-Agent": "Mozilla/5.0" }
                ,encoding: null
            }).pipe(fs.createWriteStream(apps.rtPath + imgInf.fileNm)
            .on('finish',function(){
                //Recursive
                downloadImgs(downloadImgList);
            })
            .on('error',function(e){
                logger(e);
                downloadImgs(downloadImgList);
            })
            );
        }else{
            // outCsv(resultCsv);
            return true;
        }
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
