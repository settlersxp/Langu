// src/lib/database/operations.ts
import prisma from '$lib/database/prismaClient';

export async function createDeck(data: { name: string; description?: string }) {
	return prisma.deck.create({ data });
}

export async function createSection(data: {
	deckId: number;
	foreignText: string;
	englishText: string;
	audioPath: string;
	position: number;
}) {
	return prisma.section.create({ data });
}

export async function getDeckWithSections(deckId: number) {
	return prisma.deck.findUnique({
		where: { id: deckId },
		include: { sections: true }
	});
}

export async function updateSection(
	id: number,
	data: {
		foreignText?: string;
		englishText?: string;
		audioPath?: string;
		position?: number;
	}
) {
	return prisma.section.update({
		where: { id },
		data
	});
}

export async function deleteSection(id: number) {
	return prisma.section.delete({
		where: { id }
	});
}

export async function getSectionById(id: number) {
	return prisma.section.findUnique({
		where: { id }
	});
}

export async function getAllSections() {
	return prisma.section.findMany();
}
