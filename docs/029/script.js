window.addEventListener('load', function() {
  var frameRate = 60.0;
  // canvasエレメントを取得
  var c = document.getElementById('canvas');
  c.width = 500;
  c.height = 300;

  // 各種エレメントへの参照を取得
  var elmTransparency = document.getElementById('transparency');
  var elmAdd          = document.getElementById('add');
  var elmRange        = document.getElementById('range');

  // webglコンテキストを取得
  var gl = c.getContext('webgl') || c.getContext('experimental-webgl');
  // アニメーションループに使うメソッドを決める
  var animationFrame = ( function(){
    return  window.requestAnimationFrame       ||
            window.webkitRequestAnimationFrame ||
            window.mozRequestAnimationFrame    ||
            window.oRequestAnimationFrame      ||
            window.msRequestAnimationFrame     ||
            function( callback ){
              window.setTimeout( callback, 1000.0 / frameRate );
            };
  } )();
  
  // 時間取得に使うメソッドを決める
  var now = window.performance && (
    performance.now ||
    performance.mozNow ||
    performance.msNow ||
    performance.oNow ||
    performance.webkitNow );
  
  var getTime = function() {
    return ( now && now.call( performance ) ) || ( new Date().getTime() );
  };
  
  var startTime = getTime();
  var prevTime = startTime;
  
  // アニメーションを行うメソッドを定義する。
  var animation = function() {
    // elapsed: 経過
    // どれだけ時間が経過したかミリ秒で取得
    var currentTime = getTime();
    var elapsed = currentTime - prevTime;
  
    // frameRateを秒換算したものよりもカウントが多くなったら実行
    if (elapsed > (1000.0 / frameRate)) {
      // デバッグ用の時間計測 //console.log('currentTime:', currentTime);
  
      // スタートミリ秒をアップデート
      prevTime = currentTime;
  
      // 描画の計算を行う
      //calc();
  
      // 描画する
      draw();
    }
  
    // 次呼び出しを予約する
    animationFrame(animation);
  };

  // 頂点シェーダとフラグメントシェーダの生成
  var v_shader = create_shader('vs');
  var f_shader = create_shader('fs');

  // プログラムオブジェクトの生成とリンク
  var prg = create_program(v_shader, f_shader);

  // attributeLocationを配列に取得
  var attLocation = new Array();
  attLocation[0] = gl.getAttribLocation(prg, 'position');
  attLocation[1] = gl.getAttribLocation(prg, 'color');
  attLocation[2] = gl.getAttribLocation(prg, 'textureCoord');

  // attributeの要素数を配列に格納
  var attStride = new Array();
  attStride[0] = 3;
  attStride[1] = 4;
  attStride[2] = 2;

  // 頂点位置
  var position = [
    -1.0,  1.0,  0.0,
     1.0,  1.0,  0.0,
    -1.0, -1.0,  0.0,
     1.0, -1.0,  0.0
  ];

  // 頂点色
  var color = [
    1.0,  0.0, 0.0, 1.0,
    0.0,  1.0, 0.0, 1.0,
    0.0,  0.0, 1.0, 1.0,
    1.0,  1.0, 1.0, 1.0
  ];

  // テクスチャ座標
  var textureCoord = [
    0.0,  0.0,
    1.0,  0.0,
    0.0,  1.0,
    1.0,  1.0
  ];

  // 頂点インデックス
  var index = [
    0, 1, 2,
    3, 2, 1
  ];

  // VBOとIBOの生成
  var vPosition     = create_vbo(position);
  var vColor        = create_vbo(color);
  var vTextureCoord = create_vbo(textureCoord);
  var VBOList       = [vPosition, vColor, vTextureCoord];
  var iIndex        = create_ibo(index);

  // VBOとIBOの登録
  set_attribute(VBOList, attLocation, attStride);
  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iIndex);

  // uniformLocationを配列に取得
  var uniLocation = new Array();
  uniLocation[0] = gl.getUniformLocation(prg, 'mvpMatrix');
  uniLocation[1] = gl.getUniformLocation(prg, 'vertexAlpha');
  uniLocation[2] = gl.getUniformLocation(prg, 'texture');
  uniLocation[3] = gl.getUniformLocation(prg, 'useTexture');

  // 各種行列の生成と初期化
  var m = new matIV();
  var mMatrix   = m.identity(m.create());
  var vMatrix   = m.identity(m.create());
  var pMatrix   = m.identity(m.create());
  var tmpMatrix = m.identity(m.create());
  var mvpMatrix = m.identity(m.create());

  // ビュー×プロジェクション座標変換行列
  m.lookAt([0.0, 0.0, 5.0], [0, 0, 0], [0, 1, 0], vMatrix);
  m.perspective(45, c.width / c.height, 0.1, 100, pMatrix);
  m.multiply(pMatrix, vMatrix, tmpMatrix);

  // カウンタの宣言
  var count = 0;

  // 深度テストを有効にする
  gl.enable(gl.DEPTH_TEST);
  gl.depthFunc(gl.LEQUAL);

  // テクスチャ用変数の宣言と生成
  var texture = null;
  create_texture('texture.jpg');
  //create_texture('texture.png');
  gl.activeTexture(gl.TEXTURE0);

  // 恒常ループ
  function draw() {
    // エレメントから値を取得しブレンドタイプを設定
    if(elmTransparency.checked){blend_type(0);}
    if(elmAdd.checked){blend_type(1);}

    // エレメントからアルファ成分を取得
    var vertexAlpha = parseFloat(elmRange.value / 100);

    // canvasを初期化
    gl.clearColor(0.0, 0.75, 0.75, 1.0);
    gl.clearDepth(1.0);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    
    // カウンタをインクリメントする
    count++;
    
    // カウンタを元にラジアンを算出
    var rad = (count % 360) * Math.PI / 180;

    // モデル座標変換行列の生成
    m.identity(mMatrix);
    m.translate(mMatrix, [0.25, 0.25, -0.25], mMatrix);
    m.rotate(mMatrix, rad, [0, 1, 0], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);

    // テクスチャのバインド
    gl.bindTexture(gl.TEXTURE_2D, texture);

    // ブレンディングを無効にする
    gl.disable(gl.BLEND);

    // uniform変数の登録と描画
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniform1f(uniLocation[1], 1.0);
    gl.uniform1i(uniLocation[2], 0);
    gl.uniform1i(uniLocation[3], true);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);

    // モデル座標変換行列の生成
    m.identity(mMatrix);
    m.translate(mMatrix, [-0.25, -0.25, 0.25], mMatrix);
    m.rotate(mMatrix, rad, [0, 0, 1], mMatrix);
    m.multiply(tmpMatrix, mMatrix, mvpMatrix);

    // テクスチャのバインドを解除
    gl.bindTexture(gl.TEXTURE_2D, null);

    // ブレンディングを有効にする
    gl.enable(gl.BLEND);
    
    // uniform変数の登録と描画
    gl.uniformMatrix4fv(uniLocation[0], false, mvpMatrix);
    gl.uniform1f(uniLocation[1], vertexAlpha);
    gl.uniform1i(uniLocation[2], 0);
    gl.uniform1i(uniLocation[3], false);
    gl.drawElements(gl.TRIANGLES, index.length, gl.UNSIGNED_SHORT, 0);
    
    // コンテキストの再描画
    gl.flush();
    
    // ループのために再帰呼び出し
    animationFrame(animation);
  };

  // アニメーション開始
  animation();

  // シェーダを生成する関数
  function create_shader(id){
    // シェーダを格納する変数
    var shader;

    // HTMLからscriptタグへの参照を取得
    var scriptElement = document.getElementById(id);

    // scriptタグが存在しない場合は抜ける
    if(!scriptElement){return;}

    // scriptタグのtype属性をチェック
    switch(scriptElement.type){

      // 頂点シェーダの場合
      case 'x-shader/x-vertex':
        shader = gl.createShader(gl.VERTEX_SHADER);
        break;

      // フラグメントシェーダの場合
      case 'x-shader/x-fragment':
        shader = gl.createShader(gl.FRAGMENT_SHADER);
        break;
      default :
        return;
    }

    // 生成されたシェーダにソースを割り当てる
    gl.shaderSource(shader, scriptElement.text);

    // シェーダをコンパイルする
    gl.compileShader(shader);

    // シェーダが正しくコンパイルされたかチェック
    if(gl.getShaderParameter(shader, gl.COMPILE_STATUS)){

      // 成功していたらシェーダを返して終了
      return shader;
    }else{

      // 失敗していたらエラーログをアラートする
      alert(gl.getShaderInfoLog(shader));
    }
  }

  // プログラムオブジェクトを生成しシェーダをリンクする関数
  function create_program(vs, fs){
    // プログラムオブジェクトの生成
    var program = gl.createProgram();

    // プログラムオブジェクトにシェーダを割り当てる
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);

    // シェーダをリンク
    gl.linkProgram(program);

    // シェーダのリンクが正しく行なわれたかチェック
    if(gl.getProgramParameter(program, gl.LINK_STATUS)){

      // 成功していたらプログラムオブジェクトを有効にする
      gl.useProgram(program);

      // プログラムオブジェクトを返して終了
      return program;
    }else{

      // 失敗していたらエラーログをアラートする
      alert(gl.getProgramInfoLog(program));
    }
  }

  // VBOを生成する関数
  function create_vbo(data){
    // バッファオブジェクトの生成
    var vbo = gl.createBuffer();

    // バッファをバインドする
    gl.bindBuffer(gl.ARRAY_BUFFER, vbo);

    // バッファにデータをセット
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(data), gl.STATIC_DRAW);

    // バッファのバインドを無効化
    gl.bindBuffer(gl.ARRAY_BUFFER, null);

    // 生成した VBO を返して終了
    return vbo;
  }

  // VBOをバインドし登録する関数
  function set_attribute(vbo, attL, attS){
    // 引数として受け取った配列を処理する
    for(var i in vbo){
      // バッファをバインドする
      gl.bindBuffer(gl.ARRAY_BUFFER, vbo[i]);

      // attributeLocationを有効にする
      gl.enableVertexAttribArray(attL[i]);

      // attributeLocationを通知し登録する
      gl.vertexAttribPointer(attL[i], attS[i], gl.FLOAT, false, 0, 0);
    }
  }

  // IBOを生成する関数
  function create_ibo(data){
    // バッファオブジェクトの生成
    var ibo = gl.createBuffer();

    // バッファをバインドする
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, ibo);

    // バッファにデータをセット
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Int16Array(data), gl.STATIC_DRAW);

    // バッファのバインドを無効化
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, null);

    // 生成したIBOを返して終了
    return ibo;
  }

  // テクスチャを生成する関数
  function create_texture(source, number){
    // イメージオブジェクトの生成
    var img = new Image();
    
    // データのロードをトリガーにする
    img.addEventListener('load', function (){
      // テクスチャオブジェクトの生成
      var tex = gl.createTexture();
      
      // テクスチャをバインドする
      gl.bindTexture(gl.TEXTURE_2D, tex);
      
      // テクスチャへイメージを適用
      gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, img);
      
      // ミップマップを生成
      gl.generateMipmap(gl.TEXTURE_2D);

      // テクスチャパラメータの設定
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
      gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
      // テクスチャを変数に代入
      texture = tex;
      
      // テクスチャのバインドを無効化
      gl.bindTexture(gl.TEXTURE_2D, null);
    });
    
    // イメージオブジェクトのソースを指定
    img.src = source;
  }

  // ブレンドタイプを設定する関数
  function blend_type(prm){
    switch(prm){
      // 透過処理
      case 0:
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
        break;
      // 加算合成
      case 1:
        gl.blendFunc(gl.SRC_ALPHA, gl.ONE);
        break;
      default:
        break;
    }
  }
});
