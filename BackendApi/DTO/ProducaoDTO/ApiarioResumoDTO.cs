using BackendApi.Enums;

namespace BackendApi.Dto.ApiarioDTO
{
    public class ApiarioResumoDTO
    {
        public int Id { get; set; }
        public int userId{get; set;}
        public required string Bioma { get; set; }
        public required string TipoDeAbelha { get; set; }
        public required string TipoDeMel { get; set; }
        public StatusAtividadeEnum Atividade { get; set; }
        public string? Coord_X { get; set; }
        public string? Coord_Y { get; set; }
    }
}
