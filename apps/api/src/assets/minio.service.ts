import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Minio from 'minio';

/**
 * Thin wrapper around the MinIO SDK.
 * All bucket-level operations go through here.
 */
@Injectable()
export class MinioService implements OnModuleInit {
  private readonly logger = new Logger(MinioService.name);
  private client: Minio.Client;
  private bucket: string;

  constructor(private readonly config: ConfigService) {}

  async onModuleInit(): Promise<void> {
    const mc = this.config.get<{
      endpoint: string;
      port: number;
      useSSL: boolean;
      accessKey: string;
      secretKey: string;
      bucket: string;
    }>('app.minio')!;

    this.bucket = mc.bucket;

    this.client = new Minio.Client({
      endPoint: mc.endpoint,
      port: mc.port,
      useSSL: mc.useSSL,
      accessKey: mc.accessKey,
      secretKey: mc.secretKey,
    });

    try {
      const exists = await this.client.bucketExists(this.bucket);
      if (!exists) {
        await this.client.makeBucket(this.bucket, 'us-east-1');
        this.logger.log(`Created bucket: ${this.bucket}`);
      } else {
        this.logger.log(`Bucket ready: ${this.bucket}`);
      }
    } catch (err) {
      this.logger.error('MinIO initialization error', err);
    }
  }

  /**
   * Generates a presigned PUT URL for direct client uploads.
   * @param objectKey    The storage path inside the bucket.
   * @param expirySeconds  How long the URL stays valid (default 15 min).
   */
  async presignedPutUrl(
    objectKey: string,
    expirySeconds = 900,
  ): Promise<string> {
    return this.client.presignedPutObject(this.bucket, objectKey, expirySeconds);
  }

  /**
   * Generates a presigned GET URL for reading a stored object.
   * @param objectKey    The storage path inside the bucket.
   * @param expirySeconds  How long the URL stays valid (default 1 hr).
   */
  async presignedGetUrl(
    objectKey: string,
    expirySeconds = 3600,
  ): Promise<string> {
    return this.client.presignedGetObject(this.bucket, objectKey, expirySeconds);
  }

  /**
   * Returns true if the object exists in the bucket.
   */
  async objectExists(objectKey: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucket, objectKey);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Removes an object from the bucket.
   */
  async deleteObject(objectKey: string): Promise<void> {
    await this.client.removeObject(this.bucket, objectKey);
  }

  /**
   * Returns the size (bytes) of an object, or null if not found.
   */
  async getObjectStat(objectKey: string): Promise<Minio.BucketItemStat | null> {
    try {
      return await this.client.statObject(this.bucket, objectKey);
    } catch {
      return null;
    }
  }
}
