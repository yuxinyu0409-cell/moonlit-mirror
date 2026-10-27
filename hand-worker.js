importScripts('./assets/vendor/vision-worker.js');
const {HandLandmarker,FilesetResolver}=self.MirrorVision;
let detector;
self.onmessage=async({data})=>{
 if(data.type==='init'){
  try{const files=await FilesetResolver.forVisionTasks(new URL('./assets/wasm',self.location.href).href);detector=await HandLandmarker.createFromOptions(files,{baseOptions:{modelAssetPath:new URL('./assets/hand_landmarker.task',self.location.href).href,delegate:'CPU'},runningMode:'VIDEO',numHands:1,minHandDetectionConfidence:.55,minHandPresenceConfidence:.55,minTrackingConfidence:.55});self.postMessage({type:'ready'})}catch(e){self.postMessage({type:'error',message:e.message})}
 }else if(data.type==='frame'){
  try{const result=detector.detectForVideo(data.frame,data.time);self.postMessage({type:'result',landmarks:result.landmarks[0]||null})}catch(e){self.postMessage({type:'error',message:e.message})}finally{data.frame.close()}
 }
};
