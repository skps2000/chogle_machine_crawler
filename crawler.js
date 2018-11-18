// 링크를 분석해서 다운로드 (Node.js)
// --- 모듈 로드 ---
var client = require('cheerio-httpcli');
var request = require('request');
var URL = require('url');
var fs = require('fs');
var path = require('path');

var mysql = require('mysql');

// --- 공통 설정 ---
cl = console.log;

// 링크 탐색 단계 지정
var LINK_LEVEL = 2;

// 기준 URL 페이지
var gTARGET_URL = "http://www.fomos.kr/talk/article_list/?bbs_id=";
var gbbsId = [4,5,7,9];
var gPAGE = 1;


//각 게시판 10페이지씩 돌아다니면 수집할 컨텐츠 링크
var contentsLink = [];

var list = {};

var contentsCnt = 0;

// 메인 처리 
doMain(gTARGET_URL, gbbsId, gPAGE);

// 지정 URL을 최대 level 단계까지 다운로드
function doMain(TARGET_URL, bbsId, startPg) {
    
    if( bbsId.length == 0 ) return;
    // 최대 level 확인 [0과 1레벨 까지만]
    //if (level >= bbsId.pop()) return;
    
    var bid = bbsId.pop();

    //게시판 10페이지까지 링크를 수집하고
    //수집된 링크로 들어가서 컨텐츠를 추출한다.
    // HTML 을 취득
    for(var i = startPg; i < 11; i++){

        var url = TARGET_URL+ bid + '&page=' +i;

        client.fetch(url, {}, function(err, $, res) {
            //console.log($('table.board_list').html());

            // 링크된 페이지를 취득
            $("table.board_list > tbody > tr").find('a').each(function(idx) {

                if(!$) return;

                if($(this).parents('tr').hasClass('notice')){
                    return;
                }

                // <a> 태그의 링크를 획득
                var href = $(this).attr('href');
                if (!href) return;

                // 절대 패스를 상대패스로 변환
                href = URL.resolve(TARGET_URL, href);

                // '#' 이후를 무시 (a.html#aa 과 a.html#bb 는 같다)
                href = href.replace(/\#.+$/, ""); // 말미의 # 를 제거
                //downloadRec(href, level + 1);
                
                contentsLink.push(href);

                client.fetch(href, {}, function(err, $, res) {
                    
                    if(!$) return;

                    contentsCnt++;

                    var insertStr = '';
                    var insert = {};

                    //contents title
                    cl(contentsCnt, $('div.board_area > h3').text());
                    insert.title = $('div.board_area > h3').text();
                    
                    //author, time, viewCount
                    cl(contentsCnt, $('div.board_area >  p.sub_tit span').eq(0).text());
                    cl(contentsCnt, $('div.board_area >  p.sub_tit span').eq(1).text());
                    cl(contentsCnt, $('div.board_area >  p.sub_tit span').eq(2).text());
                    insert.span01 = $('div.board_area >  p.sub_tit span').eq(0).text();
                    insert.span02 = $('div.board_area >  p.sub_tit span').eq(1).text();
                    insert.span03 = $('div.board_area >  p.sub_tit span').eq(2).text();

                    $('div.view_text').find('img').each(function(){
                        if($(this).attr('src').substr(0,4) != 'http'){
                            var src = $(this).attr('src');
                            $(this).attr('src','http://www.fomos.kr' + src);
                        }
                    });

                    //contents content
                    cl(contentsCnt, $('div.view_text').html());
                    insert.content = $('div.view_text').html();
                    
                    //reply
                    $('div.normal_reply div.reply_view').each(function(){
                        cl(contentsCnt, $(this).text());
                        insert.reply = contentsCnt, $(this).text();
                    });
                    
                    // queryInsert(insert);

                    // UTF-8의 파일을 읽기 
                    // var txt = fs.readFileSync("sample-utf8.txt", "utf-8");
                    // console.log(txt);

                    
                    // UTF-8으로 파일 쓰기 
                    insertStr += insert.title;
                    insertStr += insert.content;
                    insertStr += insert.span01;
                    insertStr += insert.span02;
                    insertStr += insert.span03;

                    fs.writeFileSync('test'+contentsCnt+'.html', insertStr);

                });

        });

    });

    }
    // 이미 다운받은 사이트는 무시
    // if (list[url]) return;
    // list[url] = true;

    // 기준 페이지 외부 페이지는 무시
    // var us = TARGET_URL.split("/");
    // us.pop();
    // var base = us.join("/");
    // if (url.indexOf(base) < 0) return;
    if(bbsId.length > 0){
        doMain(gTARGET_URL, gbbsId, gPAGE);
    }
}

function scrapContents(){
    //console.log(scrapContents);
    console.log('scrapContents');
}




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

function queryInsert(insertObj){
    
    var connection = mysql.createConnection({
        host    :'127.0.0.1',
        port : 3306,
        user : 'root',
        password : 'ghQkdaos1!',
        database:'skps'
    });
    
    connection.connect();

        // var sql = 
        // 'INSERT INTO bbs_view (TITLE, CONTENT, AUTHOR, IMG, REPLY, ETC) VALUES (\''+insert.title+'\', '
        // +'\''+'\''+','
        // +insert.span01+ '\', '
        // +'""'+', '
        // +'""'+', '
        // +'""'+')';

        // cl(sql);

        // connection.query(sql, 
        //     function(err, rows, fields) {
        //         //if (err) throw err;
    
        //         console.log( rows );
    
        //     }
        // );

}
