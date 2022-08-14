<template>
  <div id="simple-file-uploader">
    <uploader @file-added="addFile" :autoStart="false" :options="options" 
    :file-status-text="statusText" class="uploader-example" 
    ref="uploaderRef" @file-complete="fileComplete">
      <uploader-drop>
        <uploader-btn>
          <div class="upload-button">
            <el-icon class="el-icon-upload">
              <UploadFilled />
            </el-icon>
            上传
          </div>
        </uploader-btn>
      </uploader-drop>
    </uploader>
  </div>
</template>

<script setup>
import SparkMD5 from "spark-md5";
//import { postMergeFile, checkFile } from "@/service/FileApi.js"
import { nextTick, onMounted, reactive, watch,getCurrentInstance,ref } from "vue";
import http from "axios";

const options=reactive({
    target: "/api/upload/chunk",
    testChunks: false,
    query: {},
    simultaneousUploads: 1,
    chunkSize: 10 * 1024 * 1024,
    forceChunkSize: true,
    uploadMethod:'post',
    parseTimeRemaining: function(timeRemaining, parsedTimeRemaining) {
        return parsedTimeRemaining
            .replace(/\syears?/, "年")
            .replace(/\days?/, "天")
            .replace(/\shours?/, "小时")
            .replace(/\sminutes?/, "分钟")
            .replace(/\sseconds?/, "秒");
    },
    checkChunkUploadedByResponse: function(chunk, message) {
        return chunk.file.exist;
    },
    preprocess: function(chunk) {
        let { startByte, endByte } = chunk;
        let r = new FileReader();
        r.readAsArrayBuffer(chunk.file.file.slice(startByte, endByte));
        r.onload = function(e) {
            let blob = e.target.result;
            let md5 = SparkMD5.ArrayBuffer.hash(blob);
            let fileName = chunk.file.name;
            options.query.fileExt = fileName.substring(
                fileName.lastIndexOf(".") + 1,
                fileName.length
            );
            options.query.chunkMd5 = md5;
            options.query.fileMd5 = chunk.file.md5;
            chunk.preprocessFinished();
        };
    }
})
const appProperties=getCurrentInstance()?.appContext.config.globalProperties

const statusText=reactive({
    success: "上传成功",
    error: "上传失败",
    uploading: "上传中",
    paused: "暂停中",
    waiting: "资源加载中"
})

const props=defineProps({
    isShow: {
        type: Boolean,
        default: false
    },
    // 文件上传大小限制
    fileSizeLimit:{
        type: Number,
        default: 20 * 1024 * 1024
    },
    // 文件上传类型限制
    fileTypeLimit: {
        type: Array,
        default: () => {
            return [];
        }
    }
})
const emit=defineEmits(["complete","fileRemoved"])

const uploaderRef=ref(null)
onMounted(()=>{
    window.uploader=uploaderRef.value.uploader
})
const setShow=()=>{
    window.uploader.fileList.forEach(file => {
        window.uploader.removeFile(file);
    });
}
// 校验文件合法性
const checkFileLegality=(fileSize, fileType)=>{
    if(this.fileTypeLimit.indexOf(fileType.toLowerCase()) == -1){
        appProperties.$message.error('不支持该文件类型!')
        return false;
    }
    if(this.fileSizeLimit < fileSize) {
        appProperties.$message.error('文件大小不符合要求!');
        return false;
    }
    return true;
}
const addFile=(file)=>{
    window.uploader.pause();
    var blobSlice =
        File.prototype.slice ||
        File.prototype.mozSlice ||
        File.prototype.webkitSlice;
    var fileReader = new FileReader();
    var spark = new SparkMD5.ArrayBuffer();
    var chunkSize = 2097152,
        chunks = Math.ceil(file.size / chunkSize),
        currentChunk = 0;
    function loadNext() {
        var start = currentChunk * chunkSize,
            end =
                start + chunkSize >= file.size
                    ? file.size
                    : start + chunkSize;
        fileReader.readAsArrayBuffer(
            blobSlice.call(file.file, start, end)
        );
    }
    fileReader.onload = function(e) {
        spark.append(e.target.result);
        currentChunk++;
        if (currentChunk < chunks) {
            loadNext();
        } else {
            var md5 = spark.end();
            file.md5 = md5;
            let fileName = file.name;
            let fileExt = fileName.substring(
                fileName.lastIndexOf(".") + 1,
                fileName.length
            );
            http.get("/api/upload/checkFile",{params:{
                fileMd5: md5,
                fileExt: fileExt
            }}).then(data => {
                file.exist = data.data.data;
                if (data.data.data) {
                    emit(
                        "complete",
                        file,
                        data.data.dataMap.resourceKey
                    );
                    setShow();
                }
                file.uploader.resume()
                //setShow();
                currFile.value=file
            });
        }
    };
    loadNext();
}

const currFile=ref(null)
// 一个根文件（文件夹）成功上传完成。
const fileComplete=()=>{
    let arg = currFile.value;
    let md5 = arg.md5;
    if (arg.exist) {
        return;
    }
    // 如果文件
    if (arg.file){
        let file = arg.file;
        let fileName = file.name;
        let data = {
            filename: file.name,
            identifier: file.uniqueIdentifier,
            totalSize: file.size,
            type: file.type,
            fileMd5: md5,
            chunks: arg.chunks.length,
            fileExt: fileName.substring(
                fileName.lastIndexOf(".") + 1,
                fileName.length
            )
        };
        http.post("/api/upload/mergefile",data)
        .then(response => {
            emit("complete", arg.file, response.data);
            setShow();
        })
    }
}
const fileRemoved=(file)=>{
  emit('fileRemoved', file)
}
const progress=(val)=>{
    console.log(val)
}

watch(()=>props.isShow,setShow)
</script>

<style scoped>
.logo {
  height: 6em;
  padding: 1.5em;
  will-change: filter;
}
.logo:hover {
  filter: drop-shadow(0 0 2em #646cffaa);
}
.logo.vue:hover {
  filter: drop-shadow(0 0 2em #42b883aa);
}
.upload-button {
    width: 100px;
    height: 35px;
    border-radius: 5px;
    color: #3366ff;
    font-size: 16px;
    line-height: 34px;
    margin-left: 10px;
    border: 1px solid #3366ff;
    cursor: pointer;
    &.disabled {
        cursor: not-allowed;
        background-color: #ffffff;
        opacity: 0.5;
    }
    i.el-icon-upload {
        display: inline;
        font-size: 24px;
        float: left;
        line-height: 36px;
        margin-left: 10px;
        margin-right: 10px;
    }
}
</style>
