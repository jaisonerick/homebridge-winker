export class Session {
  public authToken?: string;
  public idUser?: number;
  public allUnits?: number[];
  public allUsers?: number[];

  constructor(
    public readonly username: string,
    public readonly password: string,
    public readonly clientKey: string,
    public readonly portal: number,
  ) {}

  reset() {
    this.idUser = undefined;
    this.authToken = undefined;
  }

  updateFromPortal(portal: {
    units_with_user_responsible: { id_user_unit: number; id_user: number }[];
  }) {
    const unitsWithUserResponsible = portal.units_with_user_responsible;
    this.allUnits = unitsWithUserResponsible.map((unit) => unit.id_user_unit);
    this.allUsers = unitsWithUserResponsible.map((unit) => unit.id_user);
  }
}
