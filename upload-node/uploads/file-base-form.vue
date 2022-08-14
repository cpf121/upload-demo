<template>
  <div class="gw-file-upload">
    <el-form :model="fileForm" ref="fileFormref" :rules="fileFormRules" label-width="100" label-position="top">
      <el-form-item v-if="showLibraryIdFormItem" prop="libraryId" label="所属栏目库">
        <el-select style="width:100%" v-model="fileForm.libraryId" placeholder="请选择栏目库" @change="handleLibraryIdChange">
          <el-option :key="item.id" v-for="item in libraryList" :label="item.name" :value="item.id"></el-option>
        </el-select>
      </el-form-item>
      <el-form-item prop="columnIdList" label="所属栏目" :required="true">
        <el-cascader style="width:100%" @change="handleColumnSelectChange" class="cascader" expand-trigger="hover" separator=">" :options="columnOptions" v-model="fileForm.columnIdList"></el-cascader>
      </el-form-item>
      <el-form-item prop="creatorName" label="创建者">
        <el-input :disabled="readonly" @click="setCreator" v-model="fileForm.creatorName" placeholder="请选择创建者" />
      </el-form-item>
      <el-form-item prop="name" label="文件名称">
        <el-input v-model="fileForm.name" placeholder="请输入文件名称" />
      </el-form-item>
      <el-form-item prop="description" label="文件描述">
        <el-input type="textarea" v-model="fileForm.description" placeholder="请输入文件描述" />
      </el-form-item>
      <el-form-item label="内容文件" :required="true" class="gw-not-mb">
      </el-form-item>
      <div class="gw-upload-button disabled" v-if="isPublish">
        <el-icon class="el-icon-upload">
          <UploadFilled />
        </el-icon>
        上传
      </div>
      <simple-file-uploader v-if="!isPublish" :fileSizeLimit="siteFileLimit.fileSizeLimit" :fileTypeLimit="siteFileLimit.fileTypeLimit" :isShow="true" @complete="uploadComplete" class="newUpload">
        <template #uploadBtn>
          <div class="gw-upload-button">
            <el-icon class="el-icon-upload">
              <UploadFilled />
            </el-icon>
            上传
          </div>
        </template>
      </simple-file-uploader>
      <div class="gw-file-info" v-if="fileForm.filePath && fileForm.filePath.length">
        <img class="gw-file-icon" alt="文件图标" :src="'/static/images/'+matchFileIcon(fileForm.suffix)+'.png'" />
        <span class="gw-file-name">{{(fileForm.name && fileForm.name.length > 35 ? '...' + fileForm.name.substring(fileForm.name.length - 35) : fileForm.name) + '.' + fileForm.suffix}}</span>
      </div>
      <div class="gw-upload-tip" v-if="!fileForm.filePath || !fileForm.filePath.length">
        <div>附件大小不限,可以上传word、excel、ppt、pdf、jpg等格式</div>
        <div>注意:请上传符合条件的附件,否则管理员将无法对您的资质正确评估,因此请务必按照附件要求上传</div>
      </div>
      <el-form-item label="封面图" :required="true" class="gw-not-mb">
      </el-form-item>
      <!--单个文件上传组件-->
      <single-file-uploader :fileUploadForm="fileUploadForm" :fileUploadAcceptList="imgUploadAcceptList" :fileSizeMaxLimit="siteImgLimit.imgSizeLimit" @upload-success="uploadCoverImgSuccess"></single-file-uploader>
      <div class="gw-upload-tip">
        <div>为了保证图片的正常使用,仅支持5M以内jpg、jpeg、gif、png格式图片上传.</div>
      </div>
    </el-form>
    <!-- 选择创建者 -->
    <organization
      v-if="organizationVisible"
      title="添加成员"
      :organizationVisible="organizationVisible"
      :dataFilter="selectedList"
      :changePmsCode="'all'"
      @close="close"
      @save="saveData"
    ></organization>
  </div>
</template>
<script setup>
import { computed, ref, toRefs,getCurrentInstance } from 'vue';
import { postCheckFileName, postCheckFileCode,getAdminInfo } from '@/service/site-settings/siteFileApi'
import { siteImgLimit, siteFileLimit } from '@/common/fileGlobal'
import { matchImg } from '@/common/matchImg'
import SimpleFileUploader from '@/components/base/maxFileUploader/simple-file-uploader.vue'
import SingleFileUploader from '@/components/singleFileUpload/single-file-uploader'
import organization from "@/components/organization"
import { useStore } from 'vuex';

const props=defineProps({
    // 栏目库id
    libraryId: {
      type: Number,
      default: null
    },
    columnId: {
      type: Number,
      default: null
    },
    readonly: {
      type: Boolean,
      default: _ => false
    },
    // 文件信息表单
    fileBaseForm: {
      type: Object,
      default: {}
    },
    // 级联选择器参数
    columnOptions: {
      type: Array,
      default: () => {
        return []
      }
    },
    // 是否显示栏目库选择表单项
    showLibraryIdFormItem: {
      type: Boolean,
      default: false
    },
    // 栏目库列表
    libraryList: {
      type: Array,
      default: () => {
        return []
      },
      required: false
    },
    // 是否是从文档发布
    isPublish: {
      type: Boolean,
      default: false
    }
})
const emit=defineEmits(["fileform-valid-result","library-change","column-change"])
const appProperties=getCurrentInstance()?.appContext.config.globalProperties
const store=useStore()

const {fileBaseForm,libraryId,libraryList,columnOptions} =toRefs(props)
const fileForm=computed(()=>{
  return fileBaseForm.value
})
const fileFormref=ref(null)
const nameValidator=(rule, value, callback)=>{
  if(!fileForm.value.suffix){
    return callback()
  }
  let param={
    libraryId: libraryId.value,
    name: value,
    suffix: fileForm.value.suffix
  }
  if(fileForm.value.columnIdList &&
                fileForm.value.columnIdList.length){
    param.columnId=fileForm.value.columnIdList[fileForm.value.columnIdList.length - 1]
    if(fileForm.value.id){
      param.id = fileForm.value.id
    }
    postCheckFileName(param).then(data=>{
      if(data.data){
        emit('fileform-valid-result', false)
        return callback(new Error('名称已存在!'))
      }else{
        callback()
      }
    })              
  }else{
    fileFormref.value.validateField('columnIdList')
  }
}
const fileFormRules=ref({
  libraryId: [{required: true,message: '请选择所属栏目库',trigger: 'change'}],
  columnIdList:[{required: true,message: '请选择所属栏目',trigger: 'change'}],
  creatorName: [{required: true,message: '请选择创建者名称',trigger: 'change'}],
  name: [
          {
            required: true,
            message: '请输入文件名称',
            trigger: 'change'
          },
          {
            required: true,
            message: '请输入文件名称',
            trigger: 'blur'
          },
          {
            validator: nameValidator,
            trigger: 'blur'
          },
          {
            validator: nameValidator,
            trigger: 'change'
          }
        ]
})

const validateFormData=async ()=>{
  await fileFormref.value.validate(valid=>{
    let validResult = valid
    if((!fileForm.value.filePath ||
                  !fileForm.value.filePath.length) &&
              !fileForm.value.imgPath){
      appProperties.$message.error('请先上传文件和封面图片!')
      validResult = false
    }else if((!fileForm.value.filePath ||
                  !fileForm.value.filePath.length) &&
              fileForm.value.imgPath){
      appProperties.$message.error('请先上传文件!')
      validResult = false
    }else if(fileForm.value.filePath &&
              fileForm.value.filePath.length &&
              !fileForm.value.imgPath){
      appProperties.$message.error('请先上传文件封面!')
      validResult = false
    }
    emit('fileform-valid-result', validResult)
  })
}
// 清空表单检验
const clearFormValidate=()=>{
  fileFormref.value.clearValidate()
}
defineExpose({validateFormData,clearFormValidate})

// 处理栏目库选择改变事件
const handleLibraryIdChange=(val)=>{
  fileForm.value.columnIdList = []
  let libraryName = getLibraryName(val)
  emit('library-change', val, libraryName)
}

// 获取栏目库名称
const getLibraryName=(libraryId)=>{
  if (!libraryList.value || !libraryList.value.length) return ''
  let library = libraryList.value.filter(item => item.id == libraryId)
  if (library && library.length) {
    return library[0].name
  }
  return ''
}

// 栏目选择改变事件
const handleColumnSelectChange=()=>{
  if(fileForm.value.name){
    fileFormref.value.clearValidate()
  }
  let columnNamePaths = getColumnNamePaths()
  emit('column-change', columnNamePaths)
}

// 获取栏目名称集合
const getColumnNamePaths=()=>{
  let columnNamePaths = ''
  if(
    !columnOptions.value ||
    !columnOptions.value.length ||
    !fileForm.value.columnIdList ||
    !fileForm.value.columnIdList.length
  ){
    return columnNamePaths
  }
  let columns = columnOptions.value.filter(
    item => fileForm.value.columnIdList.indexOf(item.id) != -1
  )
  if (columns && columns.length) {
    columns.forEach(item => {
      columnNamePaths += '/' + item.label
    })
  }
  return columnNamePaths
}

const organizationVisible=ref(false)
const setCreator=()=>{
  organizationVisible.value=true
}

const jumplink=computed(()=>{
  return store.state.jumplink
})
// 文件上传完成回调
const uploadComplete=(file, key)=>{
  if (!key) return
  appProperties.$message.success('上传成功!')
  let data={
    name: file.name.substring(0, file.name.lastIndexOf('.')),
    resourceKey: key,
    size: file.size / 1024,
    suffix: file.name.substring(
                file.name.lastIndexOf('.') + 1,
                file.name.length
            )
  }
  fileForm.value.name=fileForm.value.name?fileForm.value.name:data.name
  fileForm.value.filePath = [
    jumplink.value.filecenterDomain + data.resourceKey
  ]
  fileForm.value.suffix = data.suffix
  fileForm.value.size = data.size
  fileFormref.value.validateField("name")
  let isPdf = false
  let pdfPath = ''
  if (data.suffix == 'pdf') {
    isPdf = true
    pdfPath = jumplink.value.filecenterDomain + data.resourceKey
  }else if('docx,xlsx,ppt'.indexOf(data.suffix) >= 0){
    isPdf = true
    pdfPath = jumplink.value.filecenterDomain + data.resourceKey
  }
}
// 匹配已上传文件图标
const matchFileIcon=(suffix)=>{
  return matchImg(suffix)
}

const selectedList=ref([])
const getAdminInforef=()=>{
  getAdminInfo().then(data=>{
    data = data.data
    if(data){
      fileForm.value.creatorName=data.name
      fileForm.value.creatorId=data.id
      selectedList.value.push(data)
    }
  })
}
getAdminInforef()

const imgUploadAcceptList=computed(()=>{
  let list = []
  siteImgLimit.imgTypeLimit.forEach(item => {
    list.push('.' + item)
  })
  return list
})
const fileUploadForm=computed(()=>{
  return {
    filePath: fileBaseForm.value.imgPath
  }
})
// 封面上传成功回调
const uploadCoverImgSuccess=(filePath, md5, file)=>{
  fileForm.value.imgPath = filePath
}
const close=()=>{
  organizationVisible.value=false
}
const saveData=(data)=>{
  organizationVisible.value=false
  if (data && data.length){
    selectedList.value=data
    data = data[0]
    fileForm.value.creatorName=data.name
    fileForm.value.creatorId=data.id
  }
}
</script>
<style lang="scss" scoped>
.PdfInfo {
    // width: 0px;
    // height: 0px;
    overflow: hidden;
}
.gw-file-upload {
    font-family: 微软雅黑 !important;
    .el-form-item {
        margin-bottom: 15px;
        &.gw-not-mb {
            margin-bottom: 0;
        }
    }
    .el-select {
        width: 100%;
    }
    .el-cascader {
        width: 100%;
    }
    .gw-upload-button {
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
    .gw-file-info {
        line-height: 45px;
        height: 50px;
        padding: 10px 10px 5px;
        box-sizing: content-box;
        .gw-file-icon {
            height: 40px;
            float: left;
            margin-right: 15px;
        }
    }
    .gw-upload-tip {
        color: #ccc;
        font-weight: normal;
        line-height: 20px;
        font-family: initial;
        font-size: 12px;
        padding: 15px 10px 5px;
    }
    .gw-conver-set {
        padding: 10px;
        .gw-cover-set-title {
            display: inline-block;
            margin-left: 5px;
        }
        .gw-cover-set-info {
            font-size: 12px;
            margin-left: 20px;
            .el-icon-info {
                color: #f7b148;
                font-size: 14px;
                margin-right: 5px;
            }
        }
    }
}
</style>
<style>
.gw-file-edit .el-textarea__inner {
    resize: none;
}
</style>