import { Repository } from 'typeorm';
import { IPagination } from '../core';
import { BadRequestException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Product } from './product.entity';
import {
	IImageAsset,
	IProductCreateInput,
	IProductFindInput,
	IProductTranslated
} from '@gauzy/contracts';
import { TenantAwareCrudService } from '../core/crud/tenant-aware-crud.service';
import { TranslatePropertyInput } from '../core/entities/translate-base';

@Injectable()
export class ProductService extends TenantAwareCrudService<Product> {
	constructor(
		@InjectRepository(Product)
		private readonly productRepository: Repository<Product>
	) {
		super(productRepository);
	}

	async findAllProducts(
		langCode?: string,
		relations?: string[],
		findInput?: IProductFindInput
	): Promise<IPagination<Product | IProductTranslated>> {
		const total = await this.productRepository.count(findInput);
		const items = await this.productRepository.find({
			relations: relations,
			where: findInput
		});

		const propsTranslate: Array<TranslatePropertyInput> = [
			{
				prop: 'root',
				propsTranslate: [
					{ key: 'name', alias: 'name' },
					{ key: 'description', alias: 'description' }
				]
			},
			{
				prop: 'category',
				propsTranslate: [{ key: 'name', alias: 'category' }]
			},
			{ prop: 'type', propsTranslate: [{ key: 'name', alias: 'type' }] },
			{
				prop: 'description',
				propsTranslate: [{ key: 'description', alias: 'description' }]
			}
		];

		const mapData = async () => {
			if (langCode) {
				return Promise.all(
					items.map((product) =>
						product.translateNested(langCode, propsTranslate)
					)
				);
			} else {
				return items;
			}
		};

		return mapData().then((items) => {
			return { items, total };
		});
	}

	async findById(id: string, options: any): Promise<Product> {
		return await this.productRepository.findOne(id, options);
	}

	async saveProduct(productRequest: IProductCreateInput): Promise<Product> {
		return await this.productRepository.save(<any>productRequest);
	}

	async addGalleryImage(
		productId: string,
		image: IImageAsset
	): Promise<Product> {
		try {
			let product = await this.productRepository.findOne({
				where: { id: productId },
				relations: ['gallery']
			});

			product.gallery.push(image);
			return await this.productRepository.save(product);
		} catch (err) {
			throw new BadRequestException(err);
		}
	}

	async setAsFeatured(
		productId: string,
		image: IImageAsset
	): Promise<Product> {
		try {
			let product = await this.productRepository.findOne({
				where: { id: productId }
			});

			product.featuredImage = image;
			return await this.productRepository.save(product);
		} catch (err) {
			throw new BadRequestException(err);
		}
	}

	async deleteGalleryImage(
		productId: string,
		imageId: string
	): Promise<Product> {
		try {
			let product = await this.productRepository.findOne({
				where: { id: productId },
				relations: ['gallery']
			});

			product.gallery = product.gallery.filter(
				(image) => image.id !== imageId
			);
			return await this.productRepository.save(product);
		} catch (err) {
			throw new BadRequestException(err);
		}
	}
}
