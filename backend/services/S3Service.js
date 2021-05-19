/* eslint-disable no-console */
/* eslint-disable import/prefer-default-export */
import aws from 'aws-sdk';
import multer from 'multer';
import fs from 'fs';
import path from 'path';
import { dockerCommand } from 'docker-cli-js';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/config.json';
import awsconfig from '../config/awsconfig.json';

const s3 = new aws.S3(awsconfig.s3);
const { bucket } = config;

/**
 * @description upload file to s3
 * @param {string} key file name to save
 * @param {file} file upload file
 */
export const s3PutObject = async ({
  UserId, key, file,
}) => {
  const uploadPath = path.join(__dirname, '../uploads', UserId);

  // docker command dcmtk2png
  await dockerCommand(`run --rm -v ${uploadPath}:/imgs darthunix/dcmtk:latest dcmj2pnm /imgs/${file.filename} /imgs/${file.filename}.png +oj +Wi 1`)
    .then(async () => {
      const params = {
        Bucket: bucket,
        Key: key,
        ACL: 'public-read',
        Body: fs.createReadStream(path.join(__dirname, '../', `${file.path}.png`)),
      };
      // upload s3
      await s3.putObject(params).promise();
    });

  await s3.headObject({
    Bucket: bucket,
    Key: key,
  }).promise();

  // return public url
  return `https://${bucket}.s3.${awsconfig.s3.region}.amazonaws.com/${key}`;
};

/**
 * @description file upload module with multer
 */
// export const upload = multer({ storage: multer.memoryStorage() });
const multerStorage = multer.diskStorage({
  destination(req, file, cb) {
    const dest = `uploads/${req.user.id}`;
    fs.mkdirSync(dest, { recursive: true });
    cb(null, dest);
  },
  filename(req, file, cb) {
    const { originalname } = file;
    const ext = originalname.substr(originalname.lastIndexOf('.'));
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const upload = multer({ storage: multerStorage });

/**
 * @description check bucket objects and delete bucket object if exist
 */
export const emptyS3Directory = async ({ key }) => {
  const params = {
    Bucket: bucket,
    Prefix: `${process.env.NODE_ENV}/${key}/`,
  };

  const listedObjects = await s3.listObjectsV2(params).promise();
  console.log(listedObjects);
  if (listedObjects.Contents.length === 0) return;

  const deleteParams = {
    Bucket: bucket,
    Delete: { Objects: [] },
  };

  listedObjects.Contents.forEach(({ Key }) => {
    deleteParams.Delete.Objects.push({ Key });
  });

  console.log('deleteParams', deleteParams);

  await s3.deleteObjects(deleteParams).promise();

  if (listedObjects.IsTruncated) await emptyS3Directory(bucket, key);
};

/**
 * @description check bucket and create bucket if not exist
 */
export const checkAndCreateBucket = async () => {
  try {
    // check bucket exists
    await s3.headBucket({ Bucket: bucket });
  } catch (err) {
    if (err.statusCode === 404) {
      // if bucket isn't exist, create bucket
      await s3.createBucket({ Bucket: bucket }, (err2, data) => {
        if (err2) {
          // failed to created bucket
          console.log('Error', err2);
        } else {
          // success to create bucket
          console.log('Success', data.Location);
        }
      });
    }
  }
};
